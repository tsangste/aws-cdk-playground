import * as AWS from 'aws-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { generate } from 'shortid'

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

export async function handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw new Error('Table Name not Set')
  }

  if (!event.body) {
    return { statusCode: 200, body: 'No data sent' }
  }

  const putParams = {
    TableName: tableName,
    Item: {
      connectionId: event.requestContext.connectionId,
      messageId: generate(),
      message: JSON.parse(event.body).data
    }
  };

  try {
    await ddb.put(putParams).promise()
  } catch (err) {
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(err) }
  }

  return { statusCode: 200, body: 'Message Saved.' }
}
