import * as AWS from 'aws-sdk'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export async function handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION })

  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw new Error('Table Name not Set')
  }

  const putParams = {
    TableName: tableName,
    Item: {
      connectionId: event.requestContext.connectionId,
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
    }
  }

  try {
    await ddb.put(putParams).promise()
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) }
  }

  return { statusCode: 200, body: 'Connected.' }
}
