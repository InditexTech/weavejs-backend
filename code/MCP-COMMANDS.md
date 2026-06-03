# Test MCP Commands (Model Context Protocol)

## Get Available Node Types

```
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name get-available-node-types
```

## Get Node Type Schema

```
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name get-node-type-schema --tool-arg type=rectangle
```

## Get Node

```
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name get-node --tool-arg roomId=ce3a6dc1-a086-408c-9d30-e280792f5640 nodeId=d8f0a0cc-33ef-4314-88b5-b73ef0a3196f
```

## Get Image Metadata

```
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name get-image-metadata --tool-arg imageSource=https://picsum.photos/id/20/1920/1080
```

## Add Node

```
npx @modelcontextprotocol/inspector --cli http://localhost:8081/ai/v1/mcp --transport http --method tools/call --tool-name add-node --tool-arg roomId=ce3a6dc1-a086-408c-9d30-e280792f5640 containerId=mainLayer type=rectangle node='{ "x": 0, "y": 0, "width": 100, "height": 100, "fill": "#cc0000", "stroke": "#000000", "strokeWidth": 1 }'  }
```
