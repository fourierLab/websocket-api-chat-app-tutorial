import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import * as AWS                              from "aws-sdk";

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
    let connectionId = event.requestContext.connectionId;

    const callbackAPI = new AWS.ApiGatewayManagementApi({
        apiVersion: "2018-11-29",
        endpoint: event.requestContext.domainName + "/" + event.requestContext.stage,
    });

    let connectionInfo: AWS.ApiGatewayManagementApi.GetConnectionResponse;
    try {
        connectionInfo = await callbackAPI
            .getConnection({
                ConnectionId: event.requestContext.connectionId,
            })
            .promise();
    } catch (e) {
        console.log(e);
    }

    const info = {
        ...connectionInfo!,
        connectionId,
    };
    await callbackAPI.postToConnection({
        ConnectionId: event.requestContext.connectionId,
        Data: "Use the send-message route to send a message. Your info:" + JSON.stringify(info),
    }).promise();

    return {
        statusCode: 200,
    };
};
