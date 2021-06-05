import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as AwsCdkPlayground from '../lib/aws-cdk-playground-stack'

test('Creates Stack', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new AwsCdkPlayground.AwsCdkPlaygroundStack(app, 'MyTestStack')
  // THEN
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot()
})

test('DynamoDB Table Created (Connections)', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new AwsCdkPlayground.AwsCdkPlaygroundStack(app, 'MyTestStack')
  // THEN
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table', { TableName: 'connectionsTable' }))
})

test('DynamoDB Table Created (Messages)', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new AwsCdkPlayground.AwsCdkPlaygroundStack(app, 'MyTestStack')
  // THEN
  expectCDK(stack).to(haveResource('AWS::DynamoDB::Table', { TableName: 'messagesTable' }))
})

test('Lambda has TABLE_NAME ConnectionsTable Environment Variables', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new AwsCdkPlayground.AwsCdkPlaygroundStack(app, 'MyTestStack')
  // THEN
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        TABLE_NAME: { Ref: 'connectionsTable7418640E' },
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
      }
    }
  }))
})

test('Lambda has TABLE_NAME MessagesTable Environment Variables', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new AwsCdkPlayground.AwsCdkPlaygroundStack(app, 'MyTestStack')
  // THEN
  expectCDK(stack).to(haveResource('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        TABLE_NAME: { Ref: 'messagesTable7489632E' },
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
      }
    }
  }))
})
