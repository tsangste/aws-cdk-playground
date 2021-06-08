import * as Assert from 'assert'
import * as AWSMock from 'aws-sdk-mock'
import * as AWS from 'aws-sdk'
import * as Sinon from 'sinon'
import { handle } from './index'

import { PutItemInput } from 'aws-sdk/clients/dynamodb'

describe('on-connect', () => {
  beforeAll(() => {
    AWSMock.setSDKInstance(AWS)
  })

  it('successful response', async () => {
    const dbSpy = Sinon.spy()
    AWSMock.mock('DynamoDB.DocumentClient', 'put', dbSpy())

    process.env.TABLE_NAME = 'table'
    const event: any = {
      requestContext: {
        connectionId: '1234',
        domainName: 'domainName',
        stage: 'dev'
      }
    }

    const response = await handle(event)

    Assert.strictEqual(dbSpy.calledOnce, true, 'should update dynamo table via AWS SDK')
    Assert.strictEqual(response.statusCode, 200, 'return 200 status code')
    Assert.strictEqual(response.body, 'Connected.', `return 'connected' body`)

    AWSMock.restore('DynamoDB.DocumentClient')
  })

  it('table not set', () => {
    const event: any = {
      requestContext: {
        connectionId: '1234',
        domainName: 'domainName',
        stage: 'dev'
      }
    }

    Assert.rejects(async () => await handle(event), 'should throw table not set error')
  })

  it('catch dynamo db error', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'put', (params: PutItemInput, callback: Function) => {
      console.log('simulate error from dynamodb!')
      callback('error')
    })

    process.env.TABLE_NAME = 'table'
    const event: any = {
      requestContext: {
        connectionId: '1234',
        domainName: 'domainName',
        stage: 'dev'
      }
    }

    const response = await handle(event)

    Assert.strictEqual(response.statusCode, 500, 'return 500 status code')
  })
})
