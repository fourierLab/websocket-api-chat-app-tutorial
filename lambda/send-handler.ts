import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import * as AWS                              from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    let connections;
    try {
        connections = (
            await ddb.scan({ TableName: process.env.table ?? "" })
                     .promise()
        ).Items as { connectionId: string }[];
    } catch (err) {
        return {
            statusCode: 500,
        };
    }

    const callbackAPI = new AWS.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        endpoint: event.requestContext.domainName + "/" + event.requestContext.stage,
    });

    const message = JSON.parse(event.body ?? "{}").message;

    const sendMessages = connections.map(async ({ connectionId }) => {
        if (connectionId === event.requestContext.connectionId) return;

        await callbackAPI
            .postToConnection({ ConnectionId: connectionId, Data: message })
            .promise()
            .catch(e => console.error(e));
    });

    return await Promise
        .all(sendMessages)
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
