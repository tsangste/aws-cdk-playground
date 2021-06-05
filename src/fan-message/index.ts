import { DynamoDBStreamEvent } from 'aws-lambda'
import * as AWS from 'aws-sdk'

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

export async function handle(event: DynamoDBStreamEvent) {
  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw new Error('Table Name not Set')
  }

  try {
    const connectionData = await ddb.scan({ TableName: tableName, ProjectionExpression: 'connectionId, endpoint' }).promise()
    if (!connectionData || !connectionData.Items) {
      return
    }

    const postCalls = connectionData.Items.map(async ({ connectionId, endpoint }) => {
      const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: endpoint
      })

      for (const record of event.Records) {
        const newImage = record.dynamodb?.NewImage
        if (!newImage) {
          console.log('no record')
          continue
        }

        const model = AWS.DynamoDB.Converter.unmarshall(newImage)

        try {
          await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: model.message }).promise()
        } catch (e) {
          if (e.statusCode === 410) {
            console.log(`Found stale connection, deleting ${connectionId}`);
            await ddb.delete({ TableName: tableName, Key: { connectionId } }).promise()
          } else {
            throw e
          }
        }
      }
    })

    await Promise.all(postCalls)
    console.log('All Data Sent!')
  } catch (e) {
    console.error(e)
    throw e
  }
}
