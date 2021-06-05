import * as AWS from 'aws-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

export async function handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw new Error('Table Name not Set')
  }

  const deleteParams = {
    TableName: tableName,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  }

  try {
    await ddb.delete(deleteParams).promise()
  } catch (err) {
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) }
  }

  return { statusCode: 200, body: 'Disconnected.' }
}
