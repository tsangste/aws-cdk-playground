import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as dynamodb from '@aws-cdk/aws-dynamodb'
import * as lambda from '@aws-cdk/aws-lambda'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { WebSocketApi, WebSocketStage } from '@aws-cdk/aws-apigatewayv2'
import { LambdaWebSocketIntegration } from '@aws-cdk/aws-apigatewayv2-integrations'
import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources'

export class AwsCdkPlaygroundStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const connections = new dynamodb.Table(this, 'connectionsTable', {
      tableName: 'connectionsTable',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const messages = new dynamodb.Table(this, 'messagesTable', {
      tableName: 'messagesTable',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'messageId', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const onConnect = new NodejsFunction(this, 'on-connect', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/on-connect/index.ts`),
      environment: {
        TABLE_NAME: connections.tableName
      }
    })

    connections.grantWriteData(onConnect)

    const onDisconnect = new NodejsFunction(this, 'on-disconnect', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/on-disconnect/index.ts`),
      environment: {
        TABLE_NAME: connections.tableName
      }
    })

    connections.grantWriteData(onDisconnect)

    const sendMessage = new NodejsFunction(this, 'message', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/send-message/index.ts`),
      environment: {
        TABLE_NAME: messages.tableName
      }
    })

    messages.grantWriteData(sendMessage)

    const webSocketApi = new WebSocketApi(this, 'socket-gateway', {
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: onConnect }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: sendMessage }) }
    })

    webSocketApi.addRoute('message', {
      integration: new LambdaWebSocketIntegration({ handler: sendMessage })
    })

    new WebSocketStage(this, 'dev', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true
    })

    const fanMessage = new NodejsFunction(this, 'fan-message', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handle',
      entry: path.join(__dirname, `/../src/fan-message/index.ts`),
      environment: {
        TABLE_NAME: connections.tableName
      }
    })

    fanMessage.addEventSource(new DynamoEventSource(messages, {
      startingPosition: lambda.StartingPosition.LATEST
    }))

    connections.grantReadWriteData(fanMessage)

    fanMessage.addToRolePolicy(new iam.PolicyStatement(({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`]
    })))
  }
}
