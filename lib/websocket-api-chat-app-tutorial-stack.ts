import { WebSocketLambdaIntegration }                     from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { aws_dynamodb, aws_lambda_nodejs, RemovalPolicy } from "aws-cdk-lib";
import * as cdk                                           from "aws-cdk-lib";
import { BillingMode, Table }                             from "aws-cdk-lib/aws-dynamodb";
import { Runtime }                                        from "aws-cdk-lib/aws-lambda";
import { Construct }                                      from "constructs";
import { WebSocketApi, WebSocketStage }                   from "@aws-cdk/aws-apigatewayv2-alpha/lib/websocket";

export class WebsocketApiChatAppTutorialStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const table = new aws_dynamodb.Table(this, "ConnectionsTable", {
            billingMode: BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
            removalPolicy: RemovalPolicy.DESTROY,
            partitionKey: { name: "connectionId", type: aws_dynamodb.AttributeType.STRING },
        });

        const connectHandler     = this.connectHandlerBuilder(table);
        const disconnectHandler  = this.disconnectHandlerBuilder(table);
        const sendMessageHandler = this.sendMessageHandlerBuilder(table);
        const defaultHandler     = this.defaultHandlerBuilder();

        const webSocketApi = new WebSocketApi(this, "MessageApi", {
            routeSelectionExpression: "$request.body.action",
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration("MessageApiConnectIntegration", connectHandler),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration("MessageApiDisconnectIntegration", disconnectHandler),
            },
            defaultRouteOptions: {
                integration: new WebSocketLambdaIntegration("MessageApiDefaultIntegration", defaultHandler),
            },
        });

        webSocketApi.addRoute("send-message", {
            integration: new WebSocketLambdaIntegration("MessageApiSendIntegration", sendMessageHandler),
        });

        webSocketApi.grantManageConnections(sendMessageHandler);
        webSocketApi.grantManageConnections(defaultHandler);

        new WebSocketStage(this, "MessageApiProd", {
            webSocketApi,
            stageName: "prod",
            autoDeploy: true,
        });
    }

    connectHandlerBuilder(table: Table) {
        const handler = new aws_lambda_nodejs.NodejsFunction(this, "MessageWebSocketConnectHandler", {
            environment: {
                table: table.tableName,
            },
            runtime: Runtime.NODEJS_16_X,
            entry: "lambda/connect-handler.ts",
        });

        table.grantWriteData(handler);

        return handler;
    }

    disconnectHandlerBuilder(table: Table) {
        const handler = new aws_lambda_nodejs.NodejsFunction(this, "MessageWebSocketDisconnectHandler", {
            environment: {
                table: table.tableName,
            },
            runtime: Runtime.NODEJS_16_X,
            entry: "lambda/disconnect-handler.ts",
        });

        table.grantWriteData(handler);

        return handler;
    }

    sendMessageHandlerBuilder(table: Table) {
        const handler = new aws_lambda_nodejs.NodejsFunction(this, "MessageWebSocketSendHandler", {
            environment: {
                table: table.tableName,
            },
            runtime: Runtime.NODEJS_16_X,
            entry: "lambda/send-handler.ts",
        });

        table.grantReadWriteData(handler);

        return handler;
    }

    defaultHandlerBuilder() {
        return new aws_lambda_nodejs.NodejsFunction(this, "MessageWebSocketDefaultHandler", {
            entry: "lambda/default-handler.ts",
            runtime: Runtime.NODEJS_16_X,
        });
    }
}
