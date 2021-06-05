import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2'
import { LambdaWebSocketIntegration } from '@aws-cdk/aws-apigatewayv2-integrations'

export class AwsCdkPlaygroundStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const connections = new dynamodb.Table(this, 'connectionsTable', {
      tableName: 'connectionsTable',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const onConnect = new NodejsFunction(this, 'onConnect', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/onConnect/index.ts`),
      environment: {
        TABLE_NAME: 'connectionsTable'
      }
    })

    connections.grantWriteData(onConnect)

    const onDisconnect = new NodejsFunction(this, 'onDisconnect', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/onDisconnect/index.ts`),
      environment: {
        TABLE_NAME: 'connectionsTable'
      }
    })

    connections.grantWriteData(onDisconnect)

    const webSocketApi = new WebSocketApi(this, 'socket-gateway', {
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: onConnect }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: onDisconnect }) }
    })

    new WebSocketStage(this, 'dev', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true
    })
  }
}
