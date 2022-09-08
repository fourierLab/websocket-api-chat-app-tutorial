import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import * as AWS                              from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    return await ddb
        .put({
            TableName: process.env.table ?? "",
            Item: {
                connectionId: event.requestContext.connectionId,
            },
        })
        .promise()
        .then(() => ({
            statusCode: 200,
        }))
        .catch((e) => {
            console.error(e);
            return {
                statusCode: 500,
            };
        });
};
