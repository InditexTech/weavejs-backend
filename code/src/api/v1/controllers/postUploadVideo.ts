// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import ffprobe from "ffprobe";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { VideosPersistenceHandler } from "../../../videos/persistence.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { VideoModel } from "../../../database/models/video.js";
import { createVideo } from "../../../database/controllers/video.js";

export interface VideoInfo {
  width: number;
  height: number;
  codec: string;
}

export const postUploadVideoController = () => {
  const persistenceHandler = new VideosPersistenceHandler();
  const imagesPersistenceHandler = new ImagesPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;

    const roomId = req.params.roomId as string;
    const mimeType = file?.mimetype ?? "application/octet-stream";
    const data = file?.buffer ?? new Uint8Array();

    const tempVideoId = uuidv4();
    const tempFilePath = path.join(os.tmpdir(), `probe-${tempVideoId}`);
    const tempPlaceholderFilePath = path.join(
      os.tmpdir(),
      `placeholder-${tempVideoId}`
    );

    try {
      await createTemporaryVideoFile(tempFilePath, data);
      const videoInfo = await getVideoInfo(tempFilePath);

      if (!videoInfo) {
        res
          .status(500)
          .json({ status: "KO", message: "Error reading video info" });
        return;
      }

      const firstFrame = await extractFirstFrame(
        tempFilePath,
        tempPlaceholderFilePath
      );

      if (!firstFrame) {
        res
          .status(500)
          .json({ status: "KO", message: "Error reading video first frame" });
        return;
      }

      const videoId = uuidv4();
      const fileName = `${roomId}/${videoId}`;
      const frameFileName = `${roomId}/${videoId}-placeholder`;

      if (await persistenceHandler.exists(fileName)) {
        res.status(500).json({ status: "KO", message: "Video already exists" });
      }

      if (await imagesPersistenceHandler.exists(frameFileName)) {
        res
          .status(500)
          .json({ status: "KO", message: "Video placeholder already exists" });
      }

      if (file && firstFrame) {
        await persistenceHandler.persist(
          fileName,
          { size: file.size, mimeType },
          data
        );

        const videoModel = await createVideo({
          roomId,
          videoId,
          operation: "uploaded",
          status: "completed",
          mimeType: mimeType,
          fileName,
          width: videoInfo.width,
          height: videoInfo.height,
          aspectRatio: videoInfo.width / videoInfo.height,
          jobId: null,
          removalJobId: null,
          removalStatus: null,
        });

        const buffer = await fs.readFile(tempPlaceholderFilePath); // Buffer (extends Uint8Array)
        const placeholderContent = new Uint8Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength
        );

        await imagesPersistenceHandler.persist(
          frameFileName,
          { size: placeholderContent.length, mimeType: "image/png" },
          placeholderContent
        );

        broadcastToRoom(roomId, {
          jobId: null,
          type: "addVideo",
          status: "failed",
        });

        const videoJson: VideoModel = videoModel.toJSON();

        res.status(201).json({ status: "Video created OK", video: videoJson });
      } else {
        res.status(500).json({ status: "KO", message: "Error creating video" });
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ status: "KO", message: "Error creating video" });
    } finally {
      // Always clean up
      await fs.unlink(tempFilePath).catch(() => {});
    }
  };
};

async function createTemporaryVideoFile(
  tempFilePath: string,
  buffer: Buffer<ArrayBufferLike> | Uint8Array<ArrayBuffer>
): Promise<void> {
  try {
    await fs.writeFile(tempFilePath, buffer);
  } catch (err) {
    console.error("Error creating temporary video file", err);
    throw new Error("Error creating temporary video file");
  }
}

async function getVideoInfo(tmpPath: string): Promise<VideoInfo | undefined> {
  try {
    const info = await ffprobe(tmpPath, { path: ffprobeStatic.path });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = info.streams.find((s: any) => s.width && s.height);

    if (stream && stream.width && stream.height && stream.codec_name) {
      return {
        width: stream.width,
        height: stream.height,
        codec: stream.codec_name,
      };
    }

    return undefined;
  } catch (err) {
    console.error("Error getting video info:", err);
    return undefined;
  }
}

async function extractFirstFrame(
  tempFilePath: string,
  outputPath: string
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = ffmpegStatic as unknown as string;
    if (!ffmpegPath) {
      return reject(
        new Error("ffmpeg binary not found (install ffmpeg-static).")
      );
    }

    const ffArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      tempFilePath,
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-vcodec",
      "png",
      outputPath,
    ];

    const ff = spawn(ffmpegPath, ffArgs);

    const chunks: Buffer[] = [];
    let errOutput = "";

    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", (chunk: Buffer) => (errOutput += chunk.toString()));

    ff.on("error", (err) =>
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`))
    );

    ff.on("close", async (code: number) => {
      if (code !== 0) {
        return reject(
          new Error(`ffmpeg exited with code ${code}: ${errOutput}`)
        );
      }

      try {
        await fs.access(outputPath);
        resolve(outputPath);
      } catch {
        reject(new Error(`Failed to find output file at ${outputPath}`));
      }
    });
  });
}
