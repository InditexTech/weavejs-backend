import { tlDrawToWeaveNodeMappers } from "./node-mappers.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mappingTLDrawToWeaveJS = async (tldrawModel: any) => {
  const roomName = tldrawModel.name || "Untitled Moodboard";

  const nodeIdsMapping: Record<string, string> = {};

  // Hold all assets of the TLDraw document
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assets: Record<string, any> = {};

  // Hold all nodes of the TLDraw document
  const nodes = [];

  // First pass: extract assets
  const contentKeys = Object.keys(tldrawModel.content.store);
  for (const contentKey of contentKeys) {
    if (contentKey.indexOf("asset:") === 0) {
      const contentValue = tldrawModel.content.store[contentKey];
      switch (contentValue.type) {
        case "image":
          assets[contentKey] = {
            id: contentValue.id,
            resourceId: contentValue.meta.resourceId,
            width: contentValue.meta.imgWidth,
            height: contentValue.meta.imgHeight,
            mimeType: contentValue.props.mimeType,
            props: contentValue.props,
            url: contentValue.props.src,
          };
          break;
        default:
          break;
      }
    }
  }

  // First pass: extract nodes belonging to the page:page node
  for (const contentKey of contentKeys) {
    // A shape
    if (contentKey.indexOf("shape:") === 0) {
      const contentValue = tldrawModel.content.store[contentKey];
      if (
        tlDrawToWeaveNodeMappers[contentValue.type] &&
        contentValue.parentId === "page:page"
      ) {
        const node = await tlDrawToWeaveNodeMappers[contentValue.type]({
          contentKey,
          contentValue,
          nodeIdsMapping,
          assets,
        });

        nodes.push(node);
      }
    }
  }

  // Second pass: extract nodes not belonging to the page:page node
  for (const contentKey of contentKeys) {
    // A shape
    if (contentKey.indexOf("shape:") === 0) {
      const contentValue = tldrawModel.content.store[contentKey];
      if (
        tlDrawToWeaveNodeMappers[contentValue.type] &&
        contentValue.parentId !== "page:page"
      ) {
        const node = await tlDrawToWeaveNodeMappers[contentValue.type]({
          contentKey,
          contentValue,
          nodeIdsMapping,
          assets,
        });

        const parentNode = nodes.find(
          (node) => node.props.tldrawId === contentValue.parentId
        );

        parentNode.props.children.push(node);
      }
    }
  }

  let totalNodes = 0;
  let rootNodes = 0;
  let framesNodes = 0;

  for (const node of nodes) {
    if (node.type === "frame") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.props.children.sort((a: any, b: any) =>
        a.props.tldrawIndex.localeCompare(b.props.tldrawIndex)
      );
      node.props.children = node.props.children.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (childNode: any, index: number) => ({
          ...childNode,
          zIndex: index,
        })
      );
      framesNodes = framesNodes + node.props.children.length;
      totalNodes = totalNodes + framesNodes;
    }
    rootNodes++;
    totalNodes++;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes.sort((a: any, b: any) =>
    a.props.tldrawIndex.localeCompare(b.props.tldrawIndex)
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedNodes = nodes.map((childNode: any, index: number) => ({
    ...childNode,
    zIndex: index,
  }));

  return {
    room: {
      name: roomName,
    },
    statistics: {
      nodes: {
        total: totalNodes,
        root: rootNodes,
        frames: framesNodes,
      },
      assets: Object.keys(assets).length,
    },
    store: {
      weave: {
        key: "stage",
        type: "stage",
        props: {
          id: "stage",
          children: [
            {
              key: "gridLayer",
              type: "layer",
              props: {
                id: "gridLayer",
                nodeType: "layer",
                children: [],
              },
            },
            {
              key: "mainLayer",
              type: "layer",
              props: {
                id: "mainLayer",
                nodeType: "layer",
                children: sortedNodes,
              },
            },
            {
              key: "selectionLayer",
              type: "layer",
              props: {
                id: "selectionLayer",
                nodeType: "layer",
                children: [],
              },
            },
            {
              key: "usersPointersLayer",
              type: "layer",
              props: {
                id: "usersPointersLayer",
                nodeType: "layer",
                children: [],
              },
            },
            {
              key: "utilityLayer",
              type: "layer",
              props: {
                id: "utilityLayer",
                nodeType: "layer",
                children: [],
              },
            },
          ],
        },
      },
    },
  };
};
