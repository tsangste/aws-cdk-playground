import * as Assert from 'assert'
import * as AWSMock from 'aws-sdk-mock'
import * as AWS from 'aws-sdk'
import * as Sinon from 'sinon'
import { handle } from './index'

import { PutItemInput, ScanInput } from 'aws-sdk/clients/dynamodb'

describe('fan-message', () => {
  beforeAll(() => {
    AWSMock.setSDKInstance(AWS)
  })

  it('successful response', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params: ScanInput, callback: Function) => {
      console.log('scan all the things!')
      callback(null, { Items: [{ connectionId: '123', endpoint: 'endpoint/dev'}] })
    })

    const apiSpy = Sinon.spy()
    AWSMock.mock('ApiGatewayManagementApi', 'postToConnection', apiSpy())

    process.env.TABLE_NAME = 'table'
    const dynamodb: any = { NewImage: AWS.DynamoDB.Converter.marshall({ message: 'test message' }) }
    await handle({ Records: [{ dynamodb: dynamodb }] })

    Assert.strictEqual(apiSpy.calledOnce, true, 'call ApiGatewayManagementApi')
  })

  it('delete stale connection', async () => {
    AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params: ScanInput, callback: Function) => {
      console.log('scan all the things!')
      callback(null, { Items: [{ connectionId: '123', endpoint: 'endpoint/dev'}] })
    })

    AWSMock.mock('ApiGatewayManagementApi', 'postToConnection', (params: PutItemInput, callback: Function) => {
      console.log('throw 410 error')
      callback({ statusCode: 410 })
    })

    const dbSpy = Sinon.spy()
    AWSMock.mock('DynamoDB.DocumentClient', 'delete', dbSpy())

    process.env.TABLE_NAME = 'table'
    const dynamodb: any = { NewImage: AWS.DynamoDB.Converter.marshall({ message: 'test message' }) }
    await handle({ Records: [{ dynamodb: dynamodb }] })

    Assert.strictEqual(dbSpy.calledOnce, true, 'delete stale connection')
  })
})
