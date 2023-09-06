/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated July 28, 2023. Replaces all prior versions.
 *
 * Copyright (c) 2013-2023, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software or
 * otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THE
 * SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import { Animation, AttachmentTimeline, RGBATimeline, RGBTimeline, RGBA2Timeline, RGB2Timeline, AlphaTimeline, RotateTimeline, TranslateTimeline, TranslateXTimeline, TranslateYTimeline, ScaleTimeline, ScaleXTimeline, ScaleYTimeline, ShearTimeline, ShearXTimeline, ShearYTimeline, IkConstraintTimeline, TransformConstraintTimeline, PathConstraintPositionTimeline, PathConstraintSpacingTimeline, PathConstraintMixTimeline, DeformTimeline, DrawOrderTimeline, EventTimeline, SequenceTimeline } from "./Animation";
import { Sequence, SequenceModeValues } from "./attachments/Sequence";
import { BoneData } from "./BoneData";
import { Event } from "./Event";
import { EventData } from "./EventData";
import { IkConstraintData } from "./IkConstraintData";
import { PathConstraintData, PositionMode, SpacingMode } from "./PathConstraintData";
import { SkeletonData } from "./SkeletonData";
import { Skin } from "./Skin";
import { SlotData } from "./SlotData";
import { TransformConstraintData } from "./TransformConstraintData";
import { Color, Utils } from "./Utils";
/** Loads skeleton data in the Spine binary format.
 *
 * See [Spine binary format](http://esotericsoftware.com/spine-binary-format) and
 * [JSON and binary data](http://esotericsoftware.com/spine-loading-skeleton-data#JSON-and-binary-data) in the Spine
 * Runtimes Guide. */
export class SkeletonBinary {
    constructor(attachmentLoader) {
        /** Scales bone positions, image sizes, and translations as they are loaded. This allows different size images to be used at
         * runtime than were used in Spine.
         *
         * See [Scaling](http://esotericsoftware.com/spine-loading-skeleton-data#Scaling) in the Spine Runtimes Guide. */
        this.scale = 1;
        this.linkedMeshes = new Array();
        this.attachmentLoader = attachmentLoader;
    }
    readSkeletonData(binary) {
        let scale = this.scale;
        let skeletonData = new SkeletonData();
        skeletonData.name = ""; // BOZO
        let input = new BinaryInput(binary);
        let lowHash = input.readInt32();
        let highHash = input.readInt32();
        skeletonData.hash = highHash == 0 && lowHash == 0 ? null : highHash.toString(16) + lowHash.toString(16);
        skeletonData.version = input.readString();
        skeletonData.x = input.readFloat();
        skeletonData.y = input.readFloat();
        skeletonData.width = input.readFloat();
        skeletonData.height = input.readFloat();
        let nonessential = input.readBoolean();
        if (nonessential) {
            skeletonData.fps = input.readFloat();
            skeletonData.imagesPath = input.readString();
            skeletonData.audioPath = input.readString();
        }
        let n = 0;
        // Strings.
        n = input.readInt(true);
        for (let i = 0; i < n; i++) {
            let str = input.readString();
            if (!str)
                throw new Error("String in string table must not be null.");
            input.strings.push(str);
        }
        // Bones.
        n = input.readInt(true);
        for (let i = 0; i < n; i++) {
            let name = input.readString();
            if (!name)
                throw new Error("Bone name must not be null.");
            let parent = i == 0 ? null : skeletonData.bones[input.readInt(true)];
            let data = new BoneData(i, name, parent);
            data.rotation = input.readFloat();
            data.x = input.readFloat() * scale;
            data.y = input.readFloat() * scale;
            data.scaleX = input.readFloat();
            data.scaleY = input.readFloat();
            data.shearX = input.readFloat();
            data.shearY = input.readFloat();
            data.length = input.readFloat() * scale;
            data.transformMode = input.readInt(true);
            data.skinRequired = input.readBoolean();
            if (nonessential)
                Color.rgba8888ToColor(data.color, input.readInt32());
            skeletonData.bones.push(data);
        }
        // Slots.
        n = input.readInt(true);
        for (let i = 0; i < n; i++) {
            let slotName = input.readString();
            if (!slotName)
                throw new Error("Slot name must not be null.");
            let boneData = skeletonData.bones[input.readInt(true)];
            let data = new SlotData(i, slotName, boneData);
            Color.rgba8888ToColor(data.color, input.readInt32());
            let darkColor = input.readInt32();
            if (darkColor != -1)
                Color.rgb888ToColor(data.darkColor = new Color(), darkColor);
            data.attachmentName = input.readStringRef();
            data.blendMode = input.readInt(true);
            skeletonData.slots.push(data);
        }
        // IK constraints.
        n = input.readInt(true);
        for (let i = 0, nn; i < n; i++) {
            let name = input.readString();
            if (!name)
                throw new Error("IK constraint data name must not be null.");
            let data = new IkConstraintData(name);
            data.order = input.readInt(true);
            data.skinRequired = input.readBoolean();
            nn = input.readInt(true);
            for (let ii = 0; ii < nn; ii++)
                data.bones.push(skeletonData.bones[input.readInt(true)]);
            data.target = skeletonData.bones[input.readInt(true)];
            data.mix = input.readFloat();
            data.softness = input.readFloat() * scale;
            data.bendDirection = input.readByte();
            data.compress = input.readBoolean();
            data.stretch = input.readBoolean();
            data.uniform = input.readBoolean();
            skeletonData.ikConstraints.push(data);
        }
        // Transform constraints.
        n = input.readInt(true);
        for (let i = 0, nn; i < n; i++) {
            let name = input.readString();
            if (!name)
                throw new Error("Transform constraint data name must not be null.");
            let data = new TransformConstraintData(name);
            data.order = input.readInt(true);
            data.skinRequired = input.readBoolean();
            nn = input.readInt(true);
            for (let ii = 0; ii < nn; ii++)
                data.bones.push(skeletonData.bones[input.readInt(true)]);
            data.target = skeletonData.bones[input.readInt(true)];
            data.local = input.readBoolean();
            data.relative = input.readBoolean();
            data.offsetRotation = input.readFloat();
            data.offsetX = input.readFloat() * scale;
            data.offsetY = input.readFloat() * scale;
            data.offsetScaleX = input.readFloat();
            data.offsetScaleY = input.readFloat();
            data.offsetShearY = input.readFloat();
            data.mixRotate = input.readFloat();
            data.mixX = input.readFloat();
            data.mixY = input.readFloat();
            data.mixScaleX = input.readFloat();
            data.mixScaleY = input.readFloat();
            data.mixShearY = input.readFloat();
            skeletonData.transformConstraints.push(data);
        }
        // Path constraints.
        n = input.readInt(true);
        for (let i = 0, nn; i < n; i++) {
            let name = input.readString();
            if (!name)
                throw new Error("Path constraint data name must not be null.");
            let data = new PathConstraintData(name);
            data.order = input.readInt(true);
            data.skinRequired = input.readBoolean();
            nn = input.readInt(true);
            for (let ii = 0; ii < nn; ii++)
                data.bones.push(skeletonData.bones[input.readInt(true)]);
            data.target = skeletonData.slots[input.readInt(true)];
            data.positionMode = input.readInt(true);
            data.spacingMode = input.readInt(true);
            data.rotateMode = input.readInt(true);
            data.offsetRotation = input.readFloat();
            data.position = input.readFloat();
            if (data.positionMode == PositionMode.Fixed)
                data.position *= scale;
            data.spacing = input.readFloat();
            if (data.spacingMode == SpacingMode.Length || data.spacingMode == SpacingMode.Fixed)
                data.spacing *= scale;
            data.mixRotate = input.readFloat();
            data.mixX = input.readFloat();
            data.mixY = input.readFloat();
            skeletonData.pathConstraints.push(data);
        }
        // Default skin.
        let defaultSkin = this.readSkin(input, skeletonData, true, nonessential);
        if (defaultSkin) {
            skeletonData.defaultSkin = defaultSkin;
            skeletonData.skins.push(defaultSkin);
        }
        // Skins.
        {
            let i = skeletonData.skins.length;
            Utils.setArraySize(skeletonData.skins, n = i + input.readInt(true));
            for (; i < n; i++) {
                let skin = this.readSkin(input, skeletonData, false, nonessential);
                if (!skin)
                    throw new Error("readSkin() should not have returned null.");
                skeletonData.skins[i] = skin;
            }
        }
        // Linked meshes.
        n = this.linkedMeshes.length;
        for (let i = 0; i < n; i++) {
            let linkedMesh = this.linkedMeshes[i];
            let skin = !linkedMesh.skin ? skeletonData.defaultSkin : skeletonData.findSkin(linkedMesh.skin);
            if (!skin)
                throw new Error("Not skin found for linked mesh.");
            if (!linkedMesh.parent)
                throw new Error("Linked mesh parent must not be null");
            let parent = skin.getAttachment(linkedMesh.slotIndex, linkedMesh.parent);
            if (!parent)
                throw new Error(`Parent mesh not found: ${linkedMesh.parent}`);
            linkedMesh.mesh.timelineAttachment = linkedMesh.inheritTimeline ? parent : linkedMesh.mesh;
            linkedMesh.mesh.setParentMesh(parent);
            if (linkedMesh.mesh.region != null)
                linkedMesh.mesh.updateRegion();
        }
        this.linkedMeshes.length = 0;
        // Events.
        n = input.readInt(true);
        for (let i = 0; i < n; i++) {
            let eventName = input.readStringRef();
            if (!eventName)
                throw new Error;
            let data = new EventData(eventName);
            data.intValue = input.readInt(false);
            data.floatValue = input.readFloat();
            data.stringValue = input.readString();
            data.audioPath = input.readString();
            if (data.audioPath) {
                data.volume = input.readFloat();
                data.balance = input.readFloat();
            }
            skeletonData.events.push(data);
        }
        // Animations.
        n = input.readInt(true);
        for (let i = 0; i < n; i++) {
            let animationName = input.readString();
            if (!animationName)
                throw new Error("Animatio name must not be null.");
            skeletonData.animations.push(this.readAnimation(input, animationName, skeletonData));
        }
        return skeletonData;
    }
    readSkin(input, skeletonData, defaultSkin, nonessential) {
        let skin = null;
        let slotCount = 0;
        if (defaultSkin) {
            slotCount = input.readInt(true);
            if (slotCount == 0)
                return null;
            skin = new Skin("default");
        }
        else {
            let skinName = input.readStringRef();
            if (!skinName)
                throw new Error("Skin name must not be null.");
            skin = new Skin(skinName);
            skin.bones.length = input.readInt(true);
            for (let i = 0, n = skin.bones.length; i < n; i++)
                skin.bones[i] = skeletonData.bones[input.readInt(true)];
            for (let i = 0, n = input.readInt(true); i < n; i++)
                skin.constraints.push(skeletonData.ikConstraints[input.readInt(true)]);
            for (let i = 0, n = input.readInt(true); i < n; i++)
                skin.constraints.push(skeletonData.transformConstraints[input.readInt(true)]);
            for (let i = 0, n = input.readInt(true); i < n; i++)
                skin.constraints.push(skeletonData.pathConstraints[input.readInt(true)]);
            slotCount = input.readInt(true);
        }
        for (let i = 0; i < slotCount; i++) {
            let slotIndex = input.readInt(true);
            for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                let name = input.readStringRef();
                if (!name)
                    throw new Error("Attachment name must not be null");
                let attachment = this.readAttachment(input, skeletonData, skin, slotIndex, name, nonessential);
                if (attachment)
                    skin.setAttachment(slotIndex, name, attachment);
            }
        }
        return skin;
    }
    readAttachment(input, skeletonData, skin, slotIndex, attachmentName, nonessential) {
        let scale = this.scale;
        let name = input.readStringRef();
        if (!name)
            name = attachmentName;
        switch (input.readByte()) {
            case AttachmentType.Region: {
                let path = input.readStringRef();
                let rotation = input.readFloat();
                let x = input.readFloat();
                let y = input.readFloat();
                let scaleX = input.readFloat();
                let scaleY = input.readFloat();
                let width = input.readFloat();
                let height = input.readFloat();
                let color = input.readInt32();
                let sequence = this.readSequence(input);
                if (!path)
                    path = name;
                let region = this.attachmentLoader.newRegionAttachment(skin, name, path, sequence);
                if (!region)
                    return null;
                region.path = path;
                region.x = x * scale;
                region.y = y * scale;
                region.scaleX = scaleX;
                region.scaleY = scaleY;
                region.rotation = rotation;
                region.width = width * scale;
                region.height = height * scale;
                Color.rgba8888ToColor(region.color, color);
                region.sequence = sequence;
                if (sequence == null)
                    region.updateRegion();
                return region;
            }
            case AttachmentType.BoundingBox: {
                let vertexCount = input.readInt(true);
                let vertices = this.readVertices(input, vertexCount);
                let color = nonessential ? input.readInt32() : 0;
                let box = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
                if (!box)
                    return null;
                box.worldVerticesLength = vertexCount << 1;
                box.vertices = vertices.vertices;
                box.bones = vertices.bones;
                if (nonessential)
                    Color.rgba8888ToColor(box.color, color);
                return box;
            }
            case AttachmentType.Mesh: {
                let path = input.readStringRef();
                let color = input.readInt32();
                let vertexCount = input.readInt(true);
                let uvs = this.readFloatArray(input, vertexCount << 1, 1);
                let triangles = this.readShortArray(input);
                let vertices = this.readVertices(input, vertexCount);
                let hullLength = input.readInt(true);
                let sequence = this.readSequence(input);
                let edges = [];
                let width = 0, height = 0;
                if (nonessential) {
                    edges = this.readShortArray(input);
                    width = input.readFloat();
                    height = input.readFloat();
                }
                if (!path)
                    path = name;
                let mesh = this.attachmentLoader.newMeshAttachment(skin, name, path, sequence);
                if (!mesh)
                    return null;
                mesh.path = path;
                Color.rgba8888ToColor(mesh.color, color);
                mesh.bones = vertices.bones;
                mesh.vertices = vertices.vertices;
                mesh.worldVerticesLength = vertexCount << 1;
                mesh.triangles = triangles;
                mesh.regionUVs = uvs;
                if (sequence == null)
                    mesh.updateRegion();
                mesh.hullLength = hullLength << 1;
                mesh.sequence = sequence;
                if (nonessential) {
                    mesh.edges = edges;
                    mesh.width = width * scale;
                    mesh.height = height * scale;
                }
                return mesh;
            }
            case AttachmentType.LinkedMesh: {
                let path = input.readStringRef();
                let color = input.readInt32();
                let skinName = input.readStringRef();
                let parent = input.readStringRef();
                let inheritTimelines = input.readBoolean();
                let sequence = this.readSequence(input);
                let width = 0, height = 0;
                if (nonessential) {
                    width = input.readFloat();
                    height = input.readFloat();
                }
                if (!path)
                    path = name;
                let mesh = this.attachmentLoader.newMeshAttachment(skin, name, path, sequence);
                if (!mesh)
                    return null;
                mesh.path = path;
                Color.rgba8888ToColor(mesh.color, color);
                mesh.sequence = sequence;
                if (nonessential) {
                    mesh.width = width * scale;
                    mesh.height = height * scale;
                }
                this.linkedMeshes.push(new LinkedMesh(mesh, skinName, slotIndex, parent, inheritTimelines));
                return mesh;
            }
            case AttachmentType.Path: {
                let closed = input.readBoolean();
                let constantSpeed = input.readBoolean();
                let vertexCount = input.readInt(true);
                let vertices = this.readVertices(input, vertexCount);
                let lengths = Utils.newArray(vertexCount / 3, 0);
                for (let i = 0, n = lengths.length; i < n; i++)
                    lengths[i] = input.readFloat() * scale;
                let color = nonessential ? input.readInt32() : 0;
                let path = this.attachmentLoader.newPathAttachment(skin, name);
                if (!path)
                    return null;
                path.closed = closed;
                path.constantSpeed = constantSpeed;
                path.worldVerticesLength = vertexCount << 1;
                path.vertices = vertices.vertices;
                path.bones = vertices.bones;
                path.lengths = lengths;
                if (nonessential)
                    Color.rgba8888ToColor(path.color, color);
                return path;
            }
            case AttachmentType.Point: {
                let rotation = input.readFloat();
                let x = input.readFloat();
                let y = input.readFloat();
                let color = nonessential ? input.readInt32() : 0;
                let point = this.attachmentLoader.newPointAttachment(skin, name);
                if (!point)
                    return null;
                point.x = x * scale;
                point.y = y * scale;
                point.rotation = rotation;
                if (nonessential)
                    Color.rgba8888ToColor(point.color, color);
                return point;
            }
            case AttachmentType.Clipping: {
                let endSlotIndex = input.readInt(true);
                let vertexCount = input.readInt(true);
                let vertices = this.readVertices(input, vertexCount);
                let color = nonessential ? input.readInt32() : 0;
                let clip = this.attachmentLoader.newClippingAttachment(skin, name);
                if (!clip)
                    return null;
                clip.endSlot = skeletonData.slots[endSlotIndex];
                clip.worldVerticesLength = vertexCount << 1;
                clip.vertices = vertices.vertices;
                clip.bones = vertices.bones;
                if (nonessential)
                    Color.rgba8888ToColor(clip.color, color);
                return clip;
            }
        }
        return null;
    }
    readSequence(input) {
        if (!input.readBoolean())
            return null;
        let sequence = new Sequence(input.readInt(true));
        sequence.start = input.readInt(true);
        sequence.digits = input.readInt(true);
        sequence.setupIndex = input.readInt(true);
        return sequence;
    }
    readVertices(input, vertexCount) {
        let scale = this.scale;
        let verticesLength = vertexCount << 1;
        let vertices = new Vertices();
        if (!input.readBoolean()) {
            vertices.vertices = this.readFloatArray(input, verticesLength, scale);
            return vertices;
        }
        let weights = new Array();
        let bonesArray = new Array();
        for (let i = 0; i < vertexCount; i++) {
            let boneCount = input.readInt(true);
            bonesArray.push(boneCount);
            for (let ii = 0; ii < boneCount; ii++) {
                bonesArray.push(input.readInt(true));
                weights.push(input.readFloat() * scale);
                weights.push(input.readFloat() * scale);
                weights.push(input.readFloat());
            }
        }
        vertices.vertices = Utils.toFloatArray(weights);
        vertices.bones = bonesArray;
        return vertices;
    }
    readFloatArray(input, n, scale) {
        let array = new Array(n);
        if (scale == 1) {
            for (let i = 0; i < n; i++)
                array[i] = input.readFloat();
        }
        else {
            for (let i = 0; i < n; i++)
                array[i] = input.readFloat() * scale;
        }
        return array;
    }
    readShortArray(input) {
        let n = input.readInt(true);
        let array = new Array(n);
        for (let i = 0; i < n; i++)
            array[i] = input.readShort();
        return array;
    }
    readAnimation(input, name, skeletonData) {
        input.readInt(true); // Number of timelines.
        let timelines = new Array();
        let scale = this.scale;
        let tempColor1 = new Color();
        let tempColor2 = new Color();
        // Slot timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let slotIndex = input.readInt(true);
            for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                let timelineType = input.readByte();
                let frameCount = input.readInt(true);
                let frameLast = frameCount - 1;
                switch (timelineType) {
                    case SLOT_ATTACHMENT: {
                        let timeline = new AttachmentTimeline(frameCount, slotIndex);
                        for (let frame = 0; frame < frameCount; frame++)
                            timeline.setFrame(frame, input.readFloat(), input.readStringRef());
                        timelines.push(timeline);
                        break;
                    }
                    case SLOT_RGBA: {
                        let bezierCount = input.readInt(true);
                        let timeline = new RGBATimeline(frameCount, bezierCount, slotIndex);
                        let time = input.readFloat();
                        let r = input.readUnsignedByte() / 255.0;
                        let g = input.readUnsignedByte() / 255.0;
                        let b = input.readUnsignedByte() / 255.0;
                        let a = input.readUnsignedByte() / 255.0;
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, r, g, b, a);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat();
                            let r2 = input.readUnsignedByte() / 255.0;
                            let g2 = input.readUnsignedByte() / 255.0;
                            let b2 = input.readUnsignedByte() / 255.0;
                            let a2 = input.readUnsignedByte() / 255.0;
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, r, r2, 1);
                                    setBezier(input, timeline, bezier++, frame, 1, time, time2, g, g2, 1);
                                    setBezier(input, timeline, bezier++, frame, 2, time, time2, b, b2, 1);
                                    setBezier(input, timeline, bezier++, frame, 3, time, time2, a, a2, 1);
                            }
                            time = time2;
                            r = r2;
                            g = g2;
                            b = b2;
                            a = a2;
                        }
                        timelines.push(timeline);
                        break;
                    }
                    case SLOT_RGB: {
                        let bezierCount = input.readInt(true);
                        let timeline = new RGBTimeline(frameCount, bezierCount, slotIndex);
                        let time = input.readFloat();
                        let r = input.readUnsignedByte() / 255.0;
                        let g = input.readUnsignedByte() / 255.0;
                        let b = input.readUnsignedByte() / 255.0;
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, r, g, b);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat();
                            let r2 = input.readUnsignedByte() / 255.0;
                            let g2 = input.readUnsignedByte() / 255.0;
                            let b2 = input.readUnsignedByte() / 255.0;
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, r, r2, 1);
                                    setBezier(input, timeline, bezier++, frame, 1, time, time2, g, g2, 1);
                                    setBezier(input, timeline, bezier++, frame, 2, time, time2, b, b2, 1);
                            }
                            time = time2;
                            r = r2;
                            g = g2;
                            b = b2;
                        }
                        timelines.push(timeline);
                        break;
                    }
                    case SLOT_RGBA2: {
                        let bezierCount = input.readInt(true);
                        let timeline = new RGBA2Timeline(frameCount, bezierCount, slotIndex);
                        let time = input.readFloat();
                        let r = input.readUnsignedByte() / 255.0;
                        let g = input.readUnsignedByte() / 255.0;
                        let b = input.readUnsignedByte() / 255.0;
                        let a = input.readUnsignedByte() / 255.0;
                        let r2 = input.readUnsignedByte() / 255.0;
                        let g2 = input.readUnsignedByte() / 255.0;
                        let b2 = input.readUnsignedByte() / 255.0;
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, r, g, b, a, r2, g2, b2);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat();
                            let nr = input.readUnsignedByte() / 255.0;
                            let ng = input.readUnsignedByte() / 255.0;
                            let nb = input.readUnsignedByte() / 255.0;
                            let na = input.readUnsignedByte() / 255.0;
                            let nr2 = input.readUnsignedByte() / 255.0;
                            let ng2 = input.readUnsignedByte() / 255.0;
                            let nb2 = input.readUnsignedByte() / 255.0;
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, r, nr, 1);
                                    setBezier(input, timeline, bezier++, frame, 1, time, time2, g, ng, 1);
                                    setBezier(input, timeline, bezier++, frame, 2, time, time2, b, nb, 1);
                                    setBezier(input, timeline, bezier++, frame, 3, time, time2, a, na, 1);
                                    setBezier(input, timeline, bezier++, frame, 4, time, time2, r2, nr2, 1);
                                    setBezier(input, timeline, bezier++, frame, 5, time, time2, g2, ng2, 1);
                                    setBezier(input, timeline, bezier++, frame, 6, time, time2, b2, nb2, 1);
                            }
                            time = time2;
                            r = nr;
                            g = ng;
                            b = nb;
                            a = na;
                            r2 = nr2;
                            g2 = ng2;
                            b2 = nb2;
                        }
                        timelines.push(timeline);
                        break;
                    }
                    case SLOT_RGB2: {
                        let bezierCount = input.readInt(true);
                        let timeline = new RGB2Timeline(frameCount, bezierCount, slotIndex);
                        let time = input.readFloat();
                        let r = input.readUnsignedByte() / 255.0;
                        let g = input.readUnsignedByte() / 255.0;
                        let b = input.readUnsignedByte() / 255.0;
                        let r2 = input.readUnsignedByte() / 255.0;
                        let g2 = input.readUnsignedByte() / 255.0;
                        let b2 = input.readUnsignedByte() / 255.0;
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, r, g, b, r2, g2, b2);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat();
                            let nr = input.readUnsignedByte() / 255.0;
                            let ng = input.readUnsignedByte() / 255.0;
                            let nb = input.readUnsignedByte() / 255.0;
                            let nr2 = input.readUnsignedByte() / 255.0;
                            let ng2 = input.readUnsignedByte() / 255.0;
                            let nb2 = input.readUnsignedByte() / 255.0;
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, r, nr, 1);
                                    setBezier(input, timeline, bezier++, frame, 1, time, time2, g, ng, 1);
                                    setBezier(input, timeline, bezier++, frame, 2, time, time2, b, nb, 1);
                                    setBezier(input, timeline, bezier++, frame, 3, time, time2, r2, nr2, 1);
                                    setBezier(input, timeline, bezier++, frame, 4, time, time2, g2, ng2, 1);
                                    setBezier(input, timeline, bezier++, frame, 5, time, time2, b2, nb2, 1);
                            }
                            time = time2;
                            r = nr;
                            g = ng;
                            b = nb;
                            r2 = nr2;
                            g2 = ng2;
                            b2 = nb2;
                        }
                        timelines.push(timeline);
                        break;
                    }
                    case SLOT_ALPHA: {
                        let timeline = new AlphaTimeline(frameCount, input.readInt(true), slotIndex);
                        let time = input.readFloat(), a = input.readUnsignedByte() / 255;
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, a);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat();
                            let a2 = input.readUnsignedByte() / 255;
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, a, a2, 1);
                            }
                            time = time2;
                            a = a2;
                        }
                        timelines.push(timeline);
                    }
                }
            }
        }
        // Bone timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let boneIndex = input.readInt(true);
            for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                let type = input.readByte(), frameCount = input.readInt(true), bezierCount = input.readInt(true);
                switch (type) {
                    case BONE_ROTATE:
                        timelines.push(readTimeline1(input, new RotateTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_TRANSLATE:
                        timelines.push(readTimeline2(input, new TranslateTimeline(frameCount, bezierCount, boneIndex), scale));
                        break;
                    case BONE_TRANSLATEX:
                        timelines.push(readTimeline1(input, new TranslateXTimeline(frameCount, bezierCount, boneIndex), scale));
                        break;
                    case BONE_TRANSLATEY:
                        timelines.push(readTimeline1(input, new TranslateYTimeline(frameCount, bezierCount, boneIndex), scale));
                        break;
                    case BONE_SCALE:
                        timelines.push(readTimeline2(input, new ScaleTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_SCALEX:
                        timelines.push(readTimeline1(input, new ScaleXTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_SCALEY:
                        timelines.push(readTimeline1(input, new ScaleYTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_SHEAR:
                        timelines.push(readTimeline2(input, new ShearTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_SHEARX:
                        timelines.push(readTimeline1(input, new ShearXTimeline(frameCount, bezierCount, boneIndex), 1));
                        break;
                    case BONE_SHEARY:
                        timelines.push(readTimeline1(input, new ShearYTimeline(frameCount, bezierCount, boneIndex), 1));
                }
            }
        }
        // IK constraint timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let index = input.readInt(true), frameCount = input.readInt(true), frameLast = frameCount - 1;
            let timeline = new IkConstraintTimeline(frameCount, input.readInt(true), index);
            let time = input.readFloat(), mix = input.readFloat(), softness = input.readFloat() * scale;
            for (let frame = 0, bezier = 0;; frame++) {
                timeline.setFrame(frame, time, mix, softness, input.readByte(), input.readBoolean(), input.readBoolean());
                if (frame == frameLast)
                    break;
                let time2 = input.readFloat(), mix2 = input.readFloat(), softness2 = input.readFloat() * scale;
                switch (input.readByte()) {
                    case CURVE_STEPPED:
                        timeline.setStepped(frame);
                        break;
                    case CURVE_BEZIER:
                        setBezier(input, timeline, bezier++, frame, 0, time, time2, mix, mix2, 1);
                        setBezier(input, timeline, bezier++, frame, 1, time, time2, softness, softness2, scale);
                }
                time = time2;
                mix = mix2;
                softness = softness2;
            }
            timelines.push(timeline);
        }
        // Transform constraint timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let index = input.readInt(true), frameCount = input.readInt(true), frameLast = frameCount - 1;
            let timeline = new TransformConstraintTimeline(frameCount, input.readInt(true), index);
            let time = input.readFloat(), mixRotate = input.readFloat(), mixX = input.readFloat(), mixY = input.readFloat(), mixScaleX = input.readFloat(), mixScaleY = input.readFloat(), mixShearY = input.readFloat();
            for (let frame = 0, bezier = 0;; frame++) {
                timeline.setFrame(frame, time, mixRotate, mixX, mixY, mixScaleX, mixScaleY, mixShearY);
                if (frame == frameLast)
                    break;
                let time2 = input.readFloat(), mixRotate2 = input.readFloat(), mixX2 = input.readFloat(), mixY2 = input.readFloat(), mixScaleX2 = input.readFloat(), mixScaleY2 = input.readFloat(), mixShearY2 = input.readFloat();
                switch (input.readByte()) {
                    case CURVE_STEPPED:
                        timeline.setStepped(frame);
                        break;
                    case CURVE_BEZIER:
                        setBezier(input, timeline, bezier++, frame, 0, time, time2, mixRotate, mixRotate2, 1);
                        setBezier(input, timeline, bezier++, frame, 1, time, time2, mixX, mixX2, 1);
                        setBezier(input, timeline, bezier++, frame, 2, time, time2, mixY, mixY2, 1);
                        setBezier(input, timeline, bezier++, frame, 3, time, time2, mixScaleX, mixScaleX2, 1);
                        setBezier(input, timeline, bezier++, frame, 4, time, time2, mixScaleY, mixScaleY2, 1);
                        setBezier(input, timeline, bezier++, frame, 5, time, time2, mixShearY, mixShearY2, 1);
                }
                time = time2;
                mixRotate = mixRotate2;
                mixX = mixX2;
                mixY = mixY2;
                mixScaleX = mixScaleX2;
                mixScaleY = mixScaleY2;
                mixShearY = mixShearY2;
            }
            timelines.push(timeline);
        }
        // Path constraint timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let index = input.readInt(true);
            let data = skeletonData.pathConstraints[index];
            for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                switch (input.readByte()) {
                    case PATH_POSITION:
                        timelines
                            .push(readTimeline1(input, new PathConstraintPositionTimeline(input.readInt(true), input.readInt(true), index), data.positionMode == PositionMode.Fixed ? scale : 1));
                        break;
                    case PATH_SPACING:
                        timelines
                            .push(readTimeline1(input, new PathConstraintSpacingTimeline(input.readInt(true), input.readInt(true), index), data.spacingMode == SpacingMode.Length || data.spacingMode == SpacingMode.Fixed ? scale : 1));
                        break;
                    case PATH_MIX:
                        let timeline = new PathConstraintMixTimeline(input.readInt(true), input.readInt(true), index);
                        let time = input.readFloat(), mixRotate = input.readFloat(), mixX = input.readFloat(), mixY = input.readFloat();
                        for (let frame = 0, bezier = 0, frameLast = timeline.getFrameCount() - 1;; frame++) {
                            timeline.setFrame(frame, time, mixRotate, mixX, mixY);
                            if (frame == frameLast)
                                break;
                            let time2 = input.readFloat(), mixRotate2 = input.readFloat(), mixX2 = input.readFloat(), mixY2 = input.readFloat();
                            switch (input.readByte()) {
                                case CURVE_STEPPED:
                                    timeline.setStepped(frame);
                                    break;
                                case CURVE_BEZIER:
                                    setBezier(input, timeline, bezier++, frame, 0, time, time2, mixRotate, mixRotate2, 1);
                                    setBezier(input, timeline, bezier++, frame, 1, time, time2, mixX, mixX2, 1);
                                    setBezier(input, timeline, bezier++, frame, 2, time, time2, mixY, mixY2, 1);
                            }
                            time = time2;
                            mixRotate = mixRotate2;
                            mixX = mixX2;
                            mixY = mixY2;
                        }
                        timelines.push(timeline);
                }
            }
        }
        // Deform timelines.
        for (let i = 0, n = input.readInt(true); i < n; i++) {
            let skin = skeletonData.skins[input.readInt(true)];
            for (let ii = 0, nn = input.readInt(true); ii < nn; ii++) {
                let slotIndex = input.readInt(true);
                for (let iii = 0, nnn = input.readInt(true); iii < nnn; iii++) {
                    let attachmentName = input.readStringRef();
                    if (!attachmentName)
                        throw new Error("attachmentName must not be null.");
                    let attachment = skin.getAttachment(slotIndex, attachmentName);
                    let timelineType = input.readByte();
                    let frameCount = input.readInt(true);
                    let frameLast = frameCount - 1;
                    switch (timelineType) {
                        case ATTACHMENT_DEFORM: {
                            let vertexAttachment = attachment;
                            let weighted = vertexAttachment.bones;
                            let vertices = vertexAttachment.vertices;
                            let deformLength = weighted ? vertices.length / 3 * 2 : vertices.length;
                            let bezierCount = input.readInt(true);
                            let timeline = new DeformTimeline(frameCount, bezierCount, slotIndex, vertexAttachment);
                            let time = input.readFloat();
                            for (let frame = 0, bezier = 0;; frame++) {
                                let deform;
                                let end = input.readInt(true);
                                if (end == 0)
                                    deform = weighted ? Utils.newFloatArray(deformLength) : vertices;
                                else {
                                    deform = Utils.newFloatArray(deformLength);
                                    let start = input.readInt(true);
                                    end += start;
                                    if (scale == 1) {
                                        for (let v = start; v < end; v++)
                                            deform[v] = input.readFloat();
                                    }
                                    else {
                                        for (let v = start; v < end; v++)
                                            deform[v] = input.readFloat() * scale;
                                    }
                                    if (!weighted) {
                                        for (let v = 0, vn = deform.length; v < vn; v++)
                                            deform[v] += vertices[v];
                                    }
                                }
                                timeline.setFrame(frame, time, deform);
                                if (frame == frameLast)
                                    break;
                                let time2 = input.readFloat();
                                switch (input.readByte()) {
                                    case CURVE_STEPPED:
                                        timeline.setStepped(frame);
                                        break;
                                    case CURVE_BEZIER:
                                        setBezier(input, timeline, bezier++, frame, 0, time, time2, 0, 1, 1);
                                }
                                time = time2;
                            }
                            timelines.push(timeline);
                            break;
                        }
                        case ATTACHMENT_SEQUENCE: {
                            let timeline = new SequenceTimeline(frameCount, slotIndex, attachment);
                            for (let frame = 0; frame < frameCount; frame++) {
                                let time = input.readFloat();
                                let modeAndIndex = input.readInt32();
                                timeline.setFrame(frame, time, SequenceModeValues[modeAndIndex & 0xf], modeAndIndex >> 4, input.readFloat());
                            }
                            timelines.push(timeline);
                            break;
                        }
                    }
                }
            }
        }
        // Draw order timeline.
        let drawOrderCount = input.readInt(true);
        if (drawOrderCount > 0) {
            let timeline = new DrawOrderTimeline(drawOrderCount);
            let slotCount = skeletonData.slots.length;
            for (let i = 0; i < drawOrderCount; i++) {
                let time = input.readFloat();
                let offsetCount = input.readInt(true);
                let drawOrder = Utils.newArray(slotCount, 0);
                for (let ii = slotCount - 1; ii >= 0; ii--)
                    drawOrder[ii] = -1;
                let unchanged = Utils.newArray(slotCount - offsetCount, 0);
                let originalIndex = 0, unchangedIndex = 0;
                for (let ii = 0; ii < offsetCount; ii++) {
                    let slotIndex = input.readInt(true);
                    // Collect unchanged items.
                    while (originalIndex != slotIndex)
                        unchanged[unchangedIndex++] = originalIndex++;
                    // Set changed items.
                    drawOrder[originalIndex + input.readInt(true)] = originalIndex++;
                }
                // Collect remaining unchanged items.
                while (originalIndex < slotCount)
                    unchanged[unchangedIndex++] = originalIndex++;
                // Fill in unchanged items.
                for (let ii = slotCount - 1; ii >= 0; ii--)
                    if (drawOrder[ii] == -1)
                        drawOrder[ii] = unchanged[--unchangedIndex];
                timeline.setFrame(i, time, drawOrder);
            }
            timelines.push(timeline);
        }
        // Event timeline.
        let eventCount = input.readInt(true);
        if (eventCount > 0) {
            let timeline = new EventTimeline(eventCount);
            for (let i = 0; i < eventCount; i++) {
                let time = input.readFloat();
                let eventData = skeletonData.events[input.readInt(true)];
                let event = new Event(time, eventData);
                event.intValue = input.readInt(false);
                event.floatValue = input.readFloat();
                event.stringValue = input.readBoolean() ? input.readString() : eventData.stringValue;
                if (event.data.audioPath) {
                    event.volume = input.readFloat();
                    event.balance = input.readFloat();
                }
                timeline.setFrame(i, event);
            }
            timelines.push(timeline);
        }
        let duration = 0;
        for (let i = 0, n = timelines.length; i < n; i++)
            duration = Math.max(duration, timelines[i].getDuration());
        return new Animation(name, timelines, duration);
    }
}
export class BinaryInput {
    constructor(data, strings = new Array(), index = 0, buffer = new DataView(data.buffer)) {
        this.strings = strings;
        this.index = index;
        this.buffer = buffer;
    }
    readByte() {
        return this.buffer.getInt8(this.index++);
    }
    readUnsignedByte() {
        return this.buffer.getUint8(this.index++);
    }
    readShort() {
        let value = this.buffer.getInt16(this.index);
        this.index += 2;
        return value;
    }
    readInt32() {
        let value = this.buffer.getInt32(this.index);
        this.index += 4;
        return value;
    }
    readInt(optimizePositive) {
        let b = this.readByte();
        let result = b & 0x7F;
        if ((b & 0x80) != 0) {
            b = this.readByte();
            result |= (b & 0x7F) << 7;
            if ((b & 0x80) != 0) {
                b = this.readByte();
                result |= (b & 0x7F) << 14;
                if ((b & 0x80) != 0) {
                    b = this.readByte();
                    result |= (b & 0x7F) << 21;
                    if ((b & 0x80) != 0) {
                        b = this.readByte();
                        result |= (b & 0x7F) << 28;
                    }
                }
            }
        }
        return optimizePositive ? result : ((result >>> 1) ^ -(result & 1));
    }
    readStringRef() {
        let index = this.readInt(true);
        return index == 0 ? null : this.strings[index - 1];
    }
    readString() {
        let byteCount = this.readInt(true);
        switch (byteCount) {
            case 0:
                return null;
            case 1:
                return "";
        }
        byteCount--;
        let chars = "";
        let charCount = 0;
        for (let i = 0; i < byteCount;) {
            let b = this.readUnsignedByte();
            switch (b >> 4) {
                case 12:
                case 13:
                    chars += String.fromCharCode(((b & 0x1F) << 6 | this.readByte() & 0x3F));
                    i += 2;
                    break;
                case 14:
                    chars += String.fromCharCode(((b & 0x0F) << 12 | (this.readByte() & 0x3F) << 6 | this.readByte() & 0x3F));
                    i += 3;
                    break;
                default:
                    chars += String.fromCharCode(b);
                    i++;
            }
        }
        return chars;
    }
    readFloat() {
        let value = this.buffer.getFloat32(this.index);
        this.index += 4;
        return value;
    }
    readBoolean() {
        return this.readByte() != 0;
    }
}
class LinkedMesh {
    constructor(mesh, skin, slotIndex, parent, inheritDeform) {
        this.mesh = mesh;
        this.skin = skin;
        this.slotIndex = slotIndex;
        this.parent = parent;
        this.inheritTimeline = inheritDeform;
    }
}
class Vertices {
    constructor(bones = null, vertices = null) {
        this.bones = bones;
        this.vertices = vertices;
    }
}
var AttachmentType;
(function (AttachmentType) {
    AttachmentType[AttachmentType["Region"] = 0] = "Region";
    AttachmentType[AttachmentType["BoundingBox"] = 1] = "BoundingBox";
    AttachmentType[AttachmentType["Mesh"] = 2] = "Mesh";
    AttachmentType[AttachmentType["LinkedMesh"] = 3] = "LinkedMesh";
    AttachmentType[AttachmentType["Path"] = 4] = "Path";
    AttachmentType[AttachmentType["Point"] = 5] = "Point";
    AttachmentType[AttachmentType["Clipping"] = 6] = "Clipping";
})(AttachmentType || (AttachmentType = {}));
function readTimeline1(input, timeline, scale) {
    let time = input.readFloat(), value = input.readFloat() * scale;
    for (let frame = 0, bezier = 0, frameLast = timeline.getFrameCount() - 1;; frame++) {
        timeline.setFrame(frame, time, value);
        if (frame == frameLast)
            break;
        let time2 = input.readFloat(), value2 = input.readFloat() * scale;
        switch (input.readByte()) {
            case CURVE_STEPPED:
                timeline.setStepped(frame);
                break;
            case CURVE_BEZIER:
                setBezier(input, timeline, bezier++, frame, 0, time, time2, value, value2, scale);
        }
        time = time2;
        value = value2;
    }
    return timeline;
}
function readTimeline2(input, timeline, scale) {
    let time = input.readFloat(), value1 = input.readFloat() * scale, value2 = input.readFloat() * scale;
    for (let frame = 0, bezier = 0, frameLast = timeline.getFrameCount() - 1;; frame++) {
        timeline.setFrame(frame, time, value1, value2);
        if (frame == frameLast)
            break;
        let time2 = input.readFloat(), nvalue1 = input.readFloat() * scale, nvalue2 = input.readFloat() * scale;
        switch (input.readByte()) {
            case CURVE_STEPPED:
                timeline.setStepped(frame);
                break;
            case CURVE_BEZIER:
                setBezier(input, timeline, bezier++, frame, 0, time, time2, value1, nvalue1, scale);
                setBezier(input, timeline, bezier++, frame, 1, time, time2, value2, nvalue2, scale);
        }
        time = time2;
        value1 = nvalue1;
        value2 = nvalue2;
    }
    return timeline;
}
function setBezier(input, timeline, bezier, frame, value, time1, time2, value1, value2, scale) {
    timeline.setBezier(bezier, frame, value, time1, value1, input.readFloat(), input.readFloat() * scale, input.readFloat(), input.readFloat() * scale, time2, value2);
}
const BONE_ROTATE = 0;
const BONE_TRANSLATE = 1;
const BONE_TRANSLATEX = 2;
const BONE_TRANSLATEY = 3;
const BONE_SCALE = 4;
const BONE_SCALEX = 5;
const BONE_SCALEY = 6;
const BONE_SHEAR = 7;
const BONE_SHEARX = 8;
const BONE_SHEARY = 9;
const SLOT_ATTACHMENT = 0;
const SLOT_RGBA = 1;
const SLOT_RGB = 2;
const SLOT_RGBA2 = 3;
const SLOT_RGB2 = 4;
const SLOT_ALPHA = 5;
const ATTACHMENT_DEFORM = 0;
const ATTACHMENT_SEQUENCE = 1;
const PATH_POSITION = 0;
const PATH_SPACING = 1;
const PATH_MIX = 2;
const CURVE_LINEAR = 0;
const CURVE_STEPPED = 1;
const CURVE_BEZIER = 2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2tlbGV0b25CaW5hcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvU2tlbGV0b25CaW5hcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRS9FLE9BQU8sRUFBRSxTQUFTLEVBQVksa0JBQWtCLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsOEJBQThCLEVBQUUsNkJBQTZCLEVBQUUseUJBQXlCLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBaUQsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFLdGpCLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3RDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDaEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN4QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdEMsT0FBTyxFQUFF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