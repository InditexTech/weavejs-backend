// filters
import { Blur } from "konva/lib/filters/Blur";
import { Brighten } from "konva/lib/filters/Brighten";
import { Contrast } from "konva/lib/filters/Contrast";
import { Emboss } from "konva/lib/filters/Emboss";
import { Enhance } from "konva/lib/filters/Enhance";
import { Grayscale } from "konva/lib/filters/Grayscale";
import { HSL } from "konva/lib/filters/HSL";
import { HSV } from "konva/lib/filters/HSV";
import { Invert } from "konva/lib/filters/Invert";
import { Kaleidoscope } from "konva/lib/filters/Kaleidoscope";
import { Mask } from "konva/lib/filters/Mask";
import { Noise } from "konva/lib/filters/Noise";
import { Pixelate } from "konva/lib/filters/Pixelate";
import { Posterize } from "konva/lib/filters/Posterize";
import { RGB } from "konva/lib/filters/RGB";
import { RGBA } from "konva/lib/filters/RGBA";
import { Sepia } from "konva/lib/filters/Sepia";
import { Solarize } from "konva/lib/filters/Solarize";
import { Threshold } from "konva/lib/filters/Threshold";

declare global {
  export namespace Konva {
    export let enableTrace: number;
    export let pixelRatio: number;
    export let dragDistance: number;
    export let angleDeg: boolean;
    export let showWarnings: boolean;
    export let capturePointerEventsEnabled: boolean;
    export let dragButtons: Array<number>;
    export let hitOnDragEnabled: boolean;
    export const isDragging: () => boolean;
    export const isDragReady: () => boolean;

    export type Vector2d = import("konva/lib/types").Vector2d;

    export const Node: typeof import("konva/lib/Node").Node;
    export type Node = import("konva/lib/Node").Node;
    export type NodeConfig = import("konva/lib/Node").NodeConfig;

    export type KonvaEventObject<EventType> =
      import("konva/lib/Node").KonvaEventObject<EventType>;

    export type KonvaPointerEvent =
      import("konva/lib/PointerEvents").KonvaPointerEvent;

    export type KonvaEventListener<This, EventType> =
      import("konva/lib/Node").KonvaEventListener<This, EventType>;

    export const Container: typeof import("konva/lib/Container").Container;
    export type Container = import("konva/lib/Container").Container<Node>;
    export type ContainerConfig = import("konva/lib/Container").ContainerConfig;

    export const Transform: typeof import("konva/lib/Util").Transform;
    export type Transform = import("konva/lib/Util").Transform;

    export const Util: typeof import("konva/lib/Util").Util;

    export const Context: typeof import("konva/lib/Context").Context;
    export type Context = import("konva/lib/Context").Context;

    export const Stage: typeof import("konva/lib/Stage").Stage;
    export type Stage = import("konva/lib/Stage").Stage;
    export const stages: typeof import("konva/lib/Stage").stages;

    export const Layer: typeof import("konva/lib/Layer").Layer;
    export type Layer = import("konva/lib/Layer").Layer;
    export type LayerConfig = import("konva/lib/Layer").LayerConfig;

    export const FastLayer: typeof import("konva/lib/FastLayer").FastLayer;
    export type FastLayer = import("konva/lib/FastLayer").FastLayer;

    export const Group: typeof import("konva/lib/Group").Group;
    export type Group = import("konva/lib/Group").Group;

    export const DD: typeof import("konva/lib/DragAndDrop").DD;

    export const Shape: typeof import("konva/lib/Shape").Shape;
    export type Shape = import("konva/lib/Shape").Shape;
    export type ShapeConfig = import("konva/lib/Shape").ShapeConfig;
    export const shapes: typeof import("konva/lib/Shape").shapes;

    export const Animation: typeof import("konva/lib/Animation").Animation;
    export type Animation = import("konva/lib/Animation").Animation;

    export const Tween: typeof import("konva/lib/Tween").Tween;
    export type Tween = import("konva/lib/Tween").Tween;
    export type TweenConfig = import("konva/lib/Tween").TweenConfig;
    export const Easings: typeof import("konva/lib/Tween").Easings;

    export const Arc: typeof import("konva/lib/shapes/Arc").Arc;
    export type Arc = import("konva/lib/shapes/Arc").Arc;
    export type ArcConfig = import("konva/lib/shapes/Arc").ArcConfig;
    export const Arrow: typeof import("konva/lib/shapes/Arrow").Arrow;
    export type Arrow = import("konva/lib/shapes/Arrow").Arrow;
    export type ArrowConfig = import("konva/lib/shapes/Arrow").ArrowConfig;
    export const Circle: typeof import("konva/lib/shapes/Circle").Circle;
    export type Circle = import("konva/lib/shapes/Circle").Circle;
    export type CircleConfig = import("konva/lib/shapes/Circle").CircleConfig;
    export const Ellipse: typeof import("konva/lib/shapes/Ellipse").Ellipse;
    export type Ellipse = import("konva/lib/shapes/Ellipse").Ellipse;
    export type EllipseConfig =
      import("konva/lib/shapes/Ellipse").EllipseConfig;
    export const Image: typeof import("konva/lib/shapes/Image").Image;
    export type Image = import("konva/lib/shapes/Image").Image;
    export type ImageConfig = import("konva/lib/shapes/Image").ImageConfig;
    export const Label: typeof import("konva/lib/shapes/Label").Label;
    export type Label = import("konva/lib/shapes/Label").Label;
    export type LabelConfig = import("konva/lib/shapes/Label").LabelConfig;
    export const Tag: typeof import("konva/lib/shapes/Label").Tag;
    export type Tag = import("konva/lib/shapes/Label").Tag;
    export type TagConfig = import("konva/lib/shapes/Label").TagConfig;
    export const Line: typeof import("konva/lib/shapes/Line").Line;
    export type Line = import("konva/lib/shapes/Line").Line;
    export type LineConfig = import("konva/lib/shapes/Line").LineConfig;
    export const Path: typeof import("konva/lib/shapes/Path").Path;
    export type Path = import("konva/lib/shapes/Path").Path;
    export type PathConfig = import("konva/lib/shapes/Path").PathConfig;
    export const Rect: typeof import("konva/lib/shapes/Rect").Rect;
    export type Rect = import("konva/lib/shapes/Rect").Rect;
    export type RectConfig = import("konva/lib/shapes/Rect").RectConfig;
    export const RegularPolygon: typeof import("konva/lib/shapes/RegularPolygon").RegularPolygon;
    export type RegularPolygon =
      import("konva/lib/shapes/RegularPolygon").RegularPolygon;
    export type RegularPolygonConfig =
      import("konva/lib/shapes/RegularPolygon").RegularPolygonConfig;
    export const Ring: typeof import("konva/lib/shapes/Ring").Ring;
    export type Ring = import("konva/lib/shapes/Ring").Ring;
    export type RingConfig = import("konva/lib/shapes/Ring").RingConfig;
    export const Sprite: typeof import("konva/lib/shapes/Sprite").Sprite;
    export type Sprite = import("konva/lib/shapes/Sprite").Sprite;
    export type SpriteConfig = import("konva/lib/shapes/Sprite").SpriteConfig;
    export const Star: typeof import("konva/lib/shapes/Star").Star;
    export type Star = import("konva/lib/shapes/Star").Star;
    export type StarConfig = import("konva/lib/shapes/Star").StarConfig;
    export const Text: typeof import("konva/lib/shapes/Text").Text;
    export type Text = import("konva/lib/shapes/Text").Text;
    export type TextConfig = import("konva/lib/shapes/Text").TextConfig;
    export const TextPath: typeof import("konva/lib/shapes/TextPath").TextPath;
    export type TextPath = import("konva/lib/shapes/TextPath").TextPath;
    export type TextPathConfig =
      import("konva/lib/shapes/TextPath").TextPathConfig;
    export const Transformer: typeof import("konva/lib/shapes/Transformer").Transformer;
    export type Transformer =
      import("konva/lib/shapes/Transformer").Transformer;
    export type TransformerConfig =
      import("konva/lib/shapes/Transformer").TransformerConfig;
    export const Wedge: typeof import("konva/lib/shapes/Wedge").Wedge;
    export type Wedge = import("konva/lib/shapes/Wedge").Wedge;
    export type WedgeConfig = import("konva/lib/shapes/Wedge").WedgeConfig;

    export const Filters: {
      Blur: typeof Blur;
      Brighten: typeof Brighten;
      Contrast: typeof Contrast;
      Emboss: typeof Emboss;
      Enhance: typeof Enhance;
      Grayscale: typeof Grayscale;
      HSL: typeof HSL;
      HSV: typeof HSV;
      Invert: typeof Invert;
      Kaleidoscope: typeof Kaleidoscope;
      Mask: typeof Mask;
      Noise: typeof Noise;
      Pixelate: typeof Pixelate;
      Posterize: typeof Posterize;
      RGB: typeof RGB;
      RGBA: typeof RGBA;
      Sepia: typeof Sepia;
      Solarize: typeof Solarize;
      Threshold: typeof Threshold;
    };
  }
}
