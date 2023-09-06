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
import { Animation, AttachmentTimeline, RGBATimeline, RGBTimeline, AlphaTimeline, RGBA2Timeline, RGB2Timeline, RotateTimeline, TranslateTimeline, TranslateXTimeline, TranslateYTimeline, ScaleTimeline, ScaleXTimeline, ScaleYTimeline, ShearTimeline, ShearXTimeline, ShearYTimeline, IkConstraintTimeline, TransformConstraintTimeline, PathConstraintPositionTimeline, PathConstraintSpacingTimeline, PathConstraintMixTimeline, DeformTimeline, DrawOrderTimeline, EventTimeline } from "./Animation";
import { BoneData, TransformMode } from "./BoneData";
import { EventData } from "./EventData";
import { Event } from "./Event";
import { IkConstraintData } from "./IkConstraintData";
import { PathConstraintData, PositionMode, SpacingMode, RotateMode } from "./PathConstraintData";
import { SkeletonData } from "./SkeletonData";
import { Skin } from "./Skin";
import { SlotData, BlendMode } from "./SlotData";
import { TransformConstraintData } from "./TransformConstraintData";
import { Utils, Color } from "./Utils";
import { Sequence, SequenceMode } from "./attachments/Sequence";
import { SequenceTimeline } from "./Animation";
/** Loads skeleton data in the Spine JSON format.
 *
 * See [Spine JSON format](http://esotericsoftware.com/spine-json-format) and
 * [JSON and binary data](http://esotericsoftware.com/spine-loading-skeleton-data#JSON-and-binary-data) in the Spine
 * Runtimes Guide. */
export class SkeletonJson {
    constructor(attachmentLoader) {
        /** Scales bone positions, image sizes, and translations as they are loaded. This allows different size images to be used at
         * runtime than were used in Spine.
         *
         * See [Scaling](http://esotericsoftware.com/spine-loading-skeleton-data#Scaling) in the Spine Runtimes Guide. */
        this.scale = 1;
        this.linkedMeshes = new Array();
        this.attachmentLoader = attachmentLoader;
    }
    readSkeletonData(json) {
        let scale = this.scale;
        let skeletonData = new SkeletonData();
        let root = typeof (json) === "string" ? JSON.parse(json) : json;
        // Skeleton
        let skeletonMap = root.skeleton;
        if (skeletonMap) {
            skeletonData.hash = skeletonMap.hash;
            skeletonData.version = skeletonMap.spine;
            skeletonData.x = skeletonMap.x;
            skeletonData.y = skeletonMap.y;
            skeletonData.width = skeletonMap.width;
            skeletonData.height = skeletonMap.height;
            skeletonData.fps = skeletonMap.fps;
            skeletonData.imagesPath = skeletonMap.images;
        }
        // Bones
        if (root.bones) {
            for (let i = 0; i < root.bones.length; i++) {
                let boneMap = root.bones[i];
                let parent = null;
                let parentName = getValue(boneMap, "parent", null);
                if (parentName)
                    parent = skeletonData.findBone(parentName);
                let data = new BoneData(skeletonData.bones.length, boneMap.name, parent);
                data.length = getValue(boneMap, "length", 0) * scale;
                data.x = getValue(boneMap, "x", 0) * scale;
                data.y = getValue(boneMap, "y", 0) * scale;
                data.rotation = getValue(boneMap, "rotation", 0);
                data.scaleX = getValue(boneMap, "scaleX", 1);
                data.scaleY = getValue(boneMap, "scaleY", 1);
                data.shearX = getValue(boneMap, "shearX", 0);
                data.shearY = getValue(boneMap, "shearY", 0);
                data.transformMode = Utils.enumValue(TransformMode, getValue(boneMap, "transform", "Normal"));
                data.skinRequired = getValue(boneMap, "skin", false);
                let color = getValue(boneMap, "color", null);
                if (color)
                    data.color.setFromString(color);
                skeletonData.bones.push(data);
            }
        }
        // Slots.
        if (root.slots) {
            for (let i = 0; i < root.slots.length; i++) {
                let slotMap = root.slots[i];
                let boneData = skeletonData.findBone(slotMap.bone);
                if (!boneData)
                    throw new Error(`Couldn't find bone ${slotMap.bone} for slot ${slotMap.name}`);
                let data = new SlotData(skeletonData.slots.length, slotMap.name, boneData);
                let color = getValue(slotMap, "color", null);
                if (color)
                    data.color.setFromString(color);
                let dark = getValue(slotMap, "dark", null);
                if (dark)
                    data.darkColor = Color.fromString(dark);
                data.attachmentName = getValue(slotMap, "attachment", null);
                data.blendMode = Utils.enumValue(BlendMode, getValue(slotMap, "blend", "normal"));
                skeletonData.slots.push(data);
            }
        }
        // IK constraints
        if (root.ik) {
            for (let i = 0; i < root.ik.length; i++) {
                let constraintMap = root.ik[i];
                let data = new IkConstraintData(constraintMap.name);
                data.order = getValue(constraintMap, "order", 0);
                data.skinRequired = getValue(constraintMap, "skin", false);
                for (let ii = 0; ii < constraintMap.bones.length; ii++) {
                    let bone = skeletonData.findBone(constraintMap.bones[ii]);
                    if (!bone)
                        throw new Error(`Couldn't find bone ${constraintMap.bones[ii]} for IK constraint ${constraintMap.name}.`);
                    data.bones.push(bone);
                }
                let target = skeletonData.findBone(constraintMap.target);
                ;
                if (!target)
                    throw new Error(`Couldn't find target bone ${constraintMap.target} for IK constraint ${constraintMap.name}.`);
                data.target = target;
                data.mix = getValue(constraintMap, "mix", 1);
                data.softness = getValue(constraintMap, "softness", 0) * scale;
                data.bendDirection = getValue(constraintMap, "bendPositive", true) ? 1 : -1;
                data.compress = getValue(constraintMap, "compress", false);
                data.stretch = getValue(constraintMap, "stretch", false);
                data.uniform = getValue(constraintMap, "uniform", false);
                skeletonData.ikConstraints.push(data);
            }
        }
        // Transform constraints.
        if (root.transform) {
            for (let i = 0; i < root.transform.length; i++) {
                let constraintMap = root.transform[i];
                let data = new TransformConstraintData(constraintMap.name);
                data.order = getValue(constraintMap, "order", 0);
                data.skinRequired = getValue(constraintMap, "skin", false);
                for (let ii = 0; ii < constraintMap.bones.length; ii++) {
                    let boneName = constraintMap.bones[ii];
                    let bone = skeletonData.findBone(boneName);
                    if (!bone)
                        throw new Error(`Couldn't find bone ${boneName} for transform constraint ${constraintMap.name}.`);
                    data.bones.push(bone);
                }
                let targetName = constraintMap.target;
                let target = skeletonData.findBone(targetName);
                if (!target)
                    throw new Error(`Couldn't find target bone ${targetName} for transform constraint ${constraintMap.name}.`);
                data.target = target;
                data.local = getValue(constraintMap, "local", false);
                data.relative = getValue(constraintMap, "relative", false);
                data.offsetRotation = getValue(constraintMap, "rotation", 0);
                data.offsetX = getValue(constraintMap, "x", 0) * scale;
                data.offsetY = getValue(constraintMap, "y", 0) * scale;
                data.offsetScaleX = getValue(constraintMap, "scaleX", 0);
                data.offsetScaleY = getValue(constraintMap, "scaleY", 0);
                data.offsetShearY = getValue(constraintMap, "shearY", 0);
                data.mixRotate = getValue(constraintMap, "mixRotate", 1);
                data.mixX = getValue(constraintMap, "mixX", 1);
                data.mixY = getValue(constraintMap, "mixY", data.mixX);
                data.mixScaleX = getValue(constraintMap, "mixScaleX", 1);
                data.mixScaleY = getValue(constraintMap, "mixScaleY", data.mixScaleX);
                data.mixShearY = getValue(constraintMap, "mixShearY", 1);
                skeletonData.transformConstraints.push(data);
            }
        }
        // Path constraints.
        if (root.path) {
            for (let i = 0; i < root.path.length; i++) {
                let constraintMap = root.path[i];
                let data = new PathConstraintData(constraintMap.name);
                data.order = getValue(constraintMap, "order", 0);
                data.skinRequired = getValue(constraintMap, "skin", false);
                for (let ii = 0; ii < constraintMap.bones.length; ii++) {
                    let boneName = constraintMap.bones[ii];
                    let bone = skeletonData.findBone(boneName);
                    if (!bone)
                        throw new Error(`Couldn't find bone ${boneName} for path constraint ${constraintMap.name}.`);
                    data.bones.push(bone);
                }
                let targetName = constraintMap.target;
                let target = skeletonData.findSlot(targetName);
                if (!target)
                    throw new Error(`Couldn't find target slot ${targetName} for path constraint ${constraintMap.name}.`);
                data.target = target;
                data.positionMode = Utils.enumValue(PositionMode, getValue(constraintMap, "positionMode", "Percent"));
                data.spacingMode = Utils.enumValue(SpacingMode, getValue(constraintMap, "spacingMode", "Length"));
                data.rotateMode = Utils.enumValue(RotateMode, getValue(constraintMap, "rotateMode", "Tangent"));
                data.offsetRotation = getValue(constraintMap, "rotation", 0);
                data.position = getValue(constraintMap, "position", 0);
                if (data.positionMode == PositionMode.Fixed)
                    data.position *= scale;
                data.spacing = getValue(constraintMap, "spacing", 0);
                if (data.spacingMode == SpacingMode.Length || data.spacingMode == SpacingMode.Fixed)
                    data.spacing *= scale;
                data.mixRotate = getValue(constraintMap, "mixRotate", 1);
                data.mixX = getValue(constraintMap, "mixX", 1);
                data.mixY = getValue(constraintMap, "mixY", data.mixX);
                skeletonData.pathConstraints.push(data);
            }
        }
        // Skins.
        if (root.skins) {
            for (let i = 0; i < root.skins.length; i++) {
                let skinMap = root.skins[i];
                let skin = new Skin(skinMap.name);
                if (skinMap.bones) {
                    for (let ii = 0; ii < skinMap.bones.length; ii++) {
                        let boneName = skinMap.bones[ii];
                        let bone = skeletonData.findBone(boneName);
                        if (!bone)
                            throw new Error(`Couldn't find bone ${boneName} for skin ${skinMap.name}.`);
                        skin.bones.push(bone);
                    }
                }
                if (skinMap.ik) {
                    for (let ii = 0; ii < skinMap.ik.length; ii++) {
                        let constraintName = skinMap.ik[ii];
                        let constraint = skeletonData.findIkConstraint(constraintName);
                        if (!constraint)
                            throw new Error(`Couldn't find IK constraint ${constraintName} for skin ${skinMap.name}.`);
                        skin.constraints.push(constraint);
                    }
                }
                if (skinMap.transform) {
                    for (let ii = 0; ii < skinMap.transform.length; ii++) {
                        let constraintName = skinMap.transform[ii];
                        let constraint = skeletonData.findTransformConstraint(constraintName);
                        if (!constraint)
                            throw new Error(`Couldn't find transform constraint ${constraintName} for skin ${skinMap.name}.`);
                        skin.constraints.push(constraint);
                    }
                }
                if (skinMap.path) {
                    for (let ii = 0; ii < skinMap.path.length; ii++) {
                        let constraintName = skinMap.path[ii];
                        let constraint = skeletonData.findPathConstraint(constraintName);
                        if (!constraint)
                            throw new Error(`Couldn't find path constraint ${constraintName} for skin ${skinMap.name}.`);
                        skin.constraints.push(constraint);
                    }
                }
                for (let slotName in skinMap.attachments) {
                    let slot = skeletonData.findSlot(slotName);
                    if (!slot)
                        throw new Error(`Couldn't find slot ${slotName} for skin ${skinMap.name}.`);
                    let slotMap = skinMap.attachments[slotName];
                    for (let entryName in slotMap) {
                        let attachment = this.readAttachment(slotMap[entryName], skin, slot.index, entryName, skeletonData);
                        if (attachment)
                            skin.setAttachment(slot.index, entryName, attachment);
                    }
                }
                skeletonData.skins.push(skin);
                if (skin.name == "default")
                    skeletonData.defaultSkin = skin;
            }
        }
        // Linked meshes.
        for (let i = 0, n = this.linkedMeshes.length; i < n; i++) {
            let linkedMesh = this.linkedMeshes[i];
            let skin = !linkedMesh.skin ? skeletonData.defaultSkin : skeletonData.findSkin(linkedMesh.skin);
            if (!skin)
                throw new Error(`Skin not found: ${linkedMesh.skin}`);
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
        if (root.events) {
            for (let eventName in root.events) {
                let eventMap = root.events[eventName];
                let data = new EventData(eventName);
                data.intValue = getValue(eventMap, "int", 0);
                data.floatValue = getValue(eventMap, "float", 0);
                data.stringValue = getValue(eventMap, "string", "");
                data.audioPath = getValue(eventMap, "audio", null);
                if (data.audioPath) {
                    data.volume = getValue(eventMap, "volume", 1);
                    data.balance = getValue(eventMap, "balance", 0);
                }
                skeletonData.events.push(data);
            }
        }
        // Animations.
        if (root.animations) {
            for (let animationName in root.animations) {
                let animationMap = root.animations[animationName];
                this.readAnimation(animationMap, animationName, skeletonData);
            }
        }
        return skeletonData;
    }
    readAttachment(map, skin, slotIndex, name, skeletonData) {
        let scale = this.scale;
        name = getValue(map, "name", name);
        switch (getValue(map, "type", "region")) {
            case "region": {
                let path = getValue(map, "path", name);
                let sequence = this.readSequence(getValue(map, "sequence", null));
                let region = this.attachmentLoader.newRegionAttachment(skin, name, path, sequence);
                if (!region)
                    return null;
                region.path = path;
                region.x = getValue(map, "x", 0) * scale;
                region.y = getValue(map, "y", 0) * scale;
                region.scaleX = getValue(map, "scaleX", 1);
                region.scaleY = getValue(map, "scaleY", 1);
                region.rotation = getValue(map, "rotation", 0);
                region.width = map.width * scale;
                region.height = map.height * scale;
                region.sequence = sequence;
                let color = getValue(map, "color", null);
                if (color)
                    region.color.setFromString(color);
                if (region.region != null)
                    region.updateRegion();
                return region;
            }
            case "boundingbox": {
                let box = this.attachmentLoader.newBoundingBoxAttachment(skin, name);
                if (!box)
                    return null;
                this.readVertices(map, box, map.vertexCount << 1);
                let color = getValue(map, "color", null);
                if (color)
                    box.color.setFromString(color);
                return box;
            }
            case "mesh":
            case "linkedmesh": {
                let path = getValue(map, "path", name);
                let sequence = this.readSequence(getValue(map, "sequence", null));
                let mesh = this.attachmentLoader.newMeshAttachment(skin, name, path, sequence);
                if (!mesh)
                    return null;
                mesh.path = path;
                let color = getValue(map, "color", null);
                if (color)
                    mesh.color.setFromString(color);
                mesh.width = getValue(map, "width", 0) * scale;
                mesh.height = getValue(map, "height", 0) * scale;
                mesh.sequence = sequence;
                let parent = getValue(map, "parent", null);
                if (parent) {
                    this.linkedMeshes.push(new LinkedMesh(mesh, getValue(map, "skin", null), slotIndex, parent, getValue(map, "timelines", true)));
                    return mesh;
                }
                let uvs = map.uvs;
                this.readVertices(map, mesh, uvs.length);
                mesh.triangles = map.triangles;
                mesh.regionUVs = uvs;
                if (mesh.region != null)
                    mesh.updateRegion();
                mesh.edges = getValue(map, "edges", null);
                mesh.hullLength = getValue(map, "hull", 0) * 2;
                return mesh;
            }
            case "path": {
                let path = this.attachmentLoader.newPathAttachment(skin, name);
                if (!path)
                    return null;
                path.closed = getValue(map, "closed", false);
                path.constantSpeed = getValue(map, "constantSpeed", true);
                let vertexCount = map.vertexCount;
                this.readVertices(map, path, vertexCount << 1);
                let lengths = Utils.newArray(vertexCount / 3, 0);
                for (let i = 0; i < map.lengths.length; i++)
                    lengths[i] = map.lengths[i] * scale;
                path.lengths = lengths;
                let color = getValue(map, "color", null);
                if (color)
                    path.color.setFromString(color);
                return path;
            }
            case "point": {
                let point = this.attachmentLoader.newPointAttachment(skin, name);
                if (!point)
                    return null;
                point.x = getValue(map, "x", 0) * scale;
                point.y = getValue(map, "y", 0) * scale;
                point.rotation = getValue(map, "rotation", 0);
                let color = getValue(map, "color", null);
                if (color)
                    point.color.setFromString(color);
                return point;
            }
            case "clipping": {
                let clip = this.attachmentLoader.newClippingAttachment(skin, name);
                if (!clip)
                    return null;
                let end = getValue(map, "end", null);
                if (end)
                    clip.endSlot = skeletonData.findSlot(end);
                let vertexCount = map.vertexCount;
                this.readVertices(map, clip, vertexCount << 1);
                let color = getValue(map, "color", null);
                if (color)
                    clip.color.setFromString(color);
                return clip;
            }
        }
        return null;
    }
    readSequence(map) {
        if (map == null)
            return null;
        let sequence = new Sequence(getValue(map, "count", 0));
        sequence.start = getValue(map, "start", 1);
        sequence.digits = getValue(map, "digits", 0);
        sequence.setupIndex = getValue(map, "setup", 0);
        return sequence;
    }
    readVertices(map, attachment, verticesLength) {
        let scale = this.scale;
        attachment.worldVerticesLength = verticesLength;
        let vertices = map.vertices;
        if (verticesLength == vertices.length) {
            let scaledVertices = Utils.toFloatArray(vertices);
            if (scale != 1) {
                for (let i = 0, n = vertices.length; i < n; i++)
                    scaledVertices[i] *= scale;
            }
            attachment.vertices = scaledVertices;
            return;
        }
        let weights = new Array();
        let bones = new Array();
        for (let i = 0, n = vertices.length; i < n;) {
            let boneCount = vertices[i++];
            bones.push(boneCount);
            for (let nn = i + boneCount * 4; i < nn; i += 4) {
                bones.push(vertices[i]);
                weights.push(vertices[i + 1] * scale);
                weights.push(vertices[i + 2] * scale);
                weights.push(vertices[i + 3]);
            }
        }
        attachment.bones = bones;
        attachment.vertices = Utils.toFloatArray(weights);
    }
    readAnimation(map, name, skeletonData) {
        let scale = this.scale;
        let timelines = new Array();
        // Slot timelines.
        if (map.slots) {
            for (let slotName in map.slots) {
                let slotMap = map.slots[slotName];
                let slot = skeletonData.findSlot(slotName);
                if (!slot)
                    throw new Error("Slot not found: " + slotName);
                let slotIndex = slot.index;
                for (let timelineName in slotMap) {
                    let timelineMap = slotMap[timelineName];
                    if (!timelineMap)
                        continue;
                    let frames = timelineMap.length;
                    if (timelineName == "attachment") {
                        let timeline = new AttachmentTimeline(frames, slotIndex);
                        for (let frame = 0; frame < frames; frame++) {
                            let keyMap = timelineMap[frame];
                            timeline.setFrame(frame, getValue(keyMap, "time", 0), getValue(keyMap, "name", null));
                        }
                        timelines.push(timeline);
                    }
                    else if (timelineName == "rgba") {
                        let timeline = new RGBATimeline(frames, frames << 2, slotIndex);
                        let keyMap = timelineMap[0];
                        let time = getValue(keyMap, "time", 0);
                        let color = Color.fromString(keyMap.color);
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, color.r, color.g, color.b, color.a);
                            let nextMap = timelineMap[frame + 1];
                            if (!nextMap) {
                                timeline.shrink(bezier);
                                break;
                            }
                            let time2 = getValue(nextMap, "time", 0);
                            let newColor = Color.fromString(nextMap.color);
                            let curve = keyMap.curve;
                            if (curve) {
                                bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, color.r, newColor.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, color.g, newColor.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, color.b, newColor.b, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 3, time, time2, color.a, newColor.a, 1);
                            }
                            time = time2;
                            color = newColor;
                            keyMap = nextMap;
                        }
                        timelines.push(timeline);
                    }
                    else if (timelineName == "rgb") {
                        let timeline = new RGBTimeline(frames, frames * 3, slotIndex);
                        let keyMap = timelineMap[0];
                        let time = getValue(keyMap, "time", 0);
                        let color = Color.fromString(keyMap.color);
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, color.r, color.g, color.b);
                            let nextMap = timelineMap[frame + 1];
                            if (!nextMap) {
                                timeline.shrink(bezier);
                                break;
                            }
                            let time2 = getValue(nextMap, "time", 0);
                            let newColor = Color.fromString(nextMap.color);
                            let curve = keyMap.curve;
                            if (curve) {
                                bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, color.r, newColor.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, color.g, newColor.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, color.b, newColor.b, 1);
                            }
                            time = time2;
                            color = newColor;
                            keyMap = nextMap;
                        }
                        timelines.push(timeline);
                    }
                    else if (timelineName == "alpha") {
                        timelines.push(readTimeline1(timelineMap, new AlphaTimeline(frames, frames, slotIndex), 0, 1));
                    }
                    else if (timelineName == "rgba2") {
                        let timeline = new RGBA2Timeline(frames, frames * 7, slotIndex);
                        let keyMap = timelineMap[0];
                        let time = getValue(keyMap, "time", 0);
                        let color = Color.fromString(keyMap.light);
                        let color2 = Color.fromString(keyMap.dark);
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, color.r, color.g, color.b, color.a, color2.r, color2.g, color2.b);
                            let nextMap = timelineMap[frame + 1];
                            if (!nextMap) {
                                timeline.shrink(bezier);
                                break;
                            }
                            let time2 = getValue(nextMap, "time", 0);
                            let newColor = Color.fromString(nextMap.light);
                            let newColor2 = Color.fromString(nextMap.dark);
                            let curve = keyMap.curve;
                            if (curve) {
                                bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, color.r, newColor.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, color.g, newColor.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, color.b, newColor.b, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 3, time, time2, color.a, newColor.a, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 4, time, time2, color2.r, newColor2.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 5, time, time2, color2.g, newColor2.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 6, time, time2, color2.b, newColor2.b, 1);
                            }
                            time = time2;
                            color = newColor;
                            color2 = newColor2;
                            keyMap = nextMap;
                        }
                        timelines.push(timeline);
                    }
                    else if (timelineName == "rgb2") {
                        let timeline = new RGB2Timeline(frames, frames * 6, slotIndex);
                        let keyMap = timelineMap[0];
                        let time = getValue(keyMap, "time", 0);
                        let color = Color.fromString(keyMap.light);
                        let color2 = Color.fromString(keyMap.dark);
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, color.r, color.g, color.b, color2.r, color2.g, color2.b);
                            let nextMap = timelineMap[frame + 1];
                            if (!nextMap) {
                                timeline.shrink(bezier);
                                break;
                            }
                            let time2 = getValue(nextMap, "time", 0);
                            let newColor = Color.fromString(nextMap.light);
                            let newColor2 = Color.fromString(nextMap.dark);
                            let curve = keyMap.curve;
                            if (curve) {
                                bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, color.r, newColor.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, color.g, newColor.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, color.b, newColor.b, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 3, time, time2, color2.r, newColor2.r, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 4, time, time2, color2.g, newColor2.g, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 5, time, time2, color2.b, newColor2.b, 1);
                            }
                            time = time2;
                            color = newColor;
                            color2 = newColor2;
                            keyMap = nextMap;
                        }
                        timelines.push(timeline);
                    }
                }
            }
        }
        // Bone timelines.
        if (map.bones) {
            for (let boneName in map.bones) {
                let boneMap = map.bones[boneName];
                let bone = skeletonData.findBone(boneName);
                if (!bone)
                    throw new Error("Bone not found: " + boneName);
                let boneIndex = bone.index;
                for (let timelineName in boneMap) {
                    let timelineMap = boneMap[timelineName];
                    let frames = timelineMap.length;
                    if (frames == 0)
                        continue;
                    if (timelineName === "rotate") {
                        timelines.push(readTimeline1(timelineMap, new RotateTimeline(frames, frames, boneIndex), 0, 1));
                    }
                    else if (timelineName === "translate") {
                        let timeline = new TranslateTimeline(frames, frames << 1, boneIndex);
                        timelines.push(readTimeline2(timelineMap, timeline, "x", "y", 0, scale));
                    }
                    else if (timelineName === "translatex") {
                        let timeline = new TranslateXTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, scale));
                    }
                    else if (timelineName === "translatey") {
                        let timeline = new TranslateYTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, scale));
                    }
                    else if (timelineName === "scale") {
                        let timeline = new ScaleTimeline(frames, frames << 1, boneIndex);
                        timelines.push(readTimeline2(timelineMap, timeline, "x", "y", 1, 1));
                    }
                    else if (timelineName === "scalex") {
                        let timeline = new ScaleXTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 1, 1));
                    }
                    else if (timelineName === "scaley") {
                        let timeline = new ScaleYTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 1, 1));
                    }
                    else if (timelineName === "shear") {
                        let timeline = new ShearTimeline(frames, frames << 1, boneIndex);
                        timelines.push(readTimeline2(timelineMap, timeline, "x", "y", 0, 1));
                    }
                    else if (timelineName === "shearx") {
                        let timeline = new ShearXTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, 1));
                    }
                    else if (timelineName === "sheary") {
                        let timeline = new ShearYTimeline(frames, frames, boneIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, 1));
                    }
                }
            }
        }
        // IK constraint timelines.
        if (map.ik) {
            for (let constraintName in map.ik) {
                let constraintMap = map.ik[constraintName];
                let keyMap = constraintMap[0];
                if (!keyMap)
                    continue;
                let constraint = skeletonData.findIkConstraint(constraintName);
                if (!constraint)
                    throw new Error("IK Constraint not found: " + constraintName);
                let constraintIndex = skeletonData.ikConstraints.indexOf(constraint);
                let timeline = new IkConstraintTimeline(constraintMap.length, constraintMap.length << 1, constraintIndex);
                let time = getValue(keyMap, "time", 0);
                let mix = getValue(keyMap, "mix", 1);
                let softness = getValue(keyMap, "softness", 0) * scale;
                for (let frame = 0, bezier = 0;; frame++) {
                    timeline.setFrame(frame, time, mix, softness, getValue(keyMap, "bendPositive", true) ? 1 : -1, getValue(keyMap, "compress", false), getValue(keyMap, "stretch", false));
                    let nextMap = constraintMap[frame + 1];
                    if (!nextMap) {
                        timeline.shrink(bezier);
                        break;
                    }
                    let time2 = getValue(nextMap, "time", 0);
                    let mix2 = getValue(nextMap, "mix", 1);
                    let softness2 = getValue(nextMap, "softness", 0) * scale;
                    let curve = keyMap.curve;
                    if (curve) {
                        bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, mix, mix2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, softness, softness2, scale);
                    }
                    time = time2;
                    mix = mix2;
                    softness = softness2;
                    keyMap = nextMap;
                }
                timelines.push(timeline);
            }
        }
        // Transform constraint timelines.
        if (map.transform) {
            for (let constraintName in map.transform) {
                let timelineMap = map.transform[constraintName];
                let keyMap = timelineMap[0];
                if (!keyMap)
                    continue;
                let constraint = skeletonData.findTransformConstraint(constraintName);
                if (!constraint)
                    throw new Error("Transform constraint not found: " + constraintName);
                let constraintIndex = skeletonData.transformConstraints.indexOf(constraint);
                let timeline = new TransformConstraintTimeline(timelineMap.length, timelineMap.length * 6, constraintIndex);
                let time = getValue(keyMap, "time", 0);
                let mixRotate = getValue(keyMap, "mixRotate", 1);
                let mixX = getValue(keyMap, "mixX", 1);
                let mixY = getValue(keyMap, "mixY", mixX);
                let mixScaleX = getValue(keyMap, "mixScaleX", 1);
                let mixScaleY = getValue(keyMap, "mixScaleY", mixScaleX);
                let mixShearY = getValue(keyMap, "mixShearY", 1);
                for (let frame = 0, bezier = 0;; frame++) {
                    timeline.setFrame(frame, time, mixRotate, mixX, mixY, mixScaleX, mixScaleY, mixShearY);
                    let nextMap = timelineMap[frame + 1];
                    if (!nextMap) {
                        timeline.shrink(bezier);
                        break;
                    }
                    let time2 = getValue(nextMap, "time", 0);
                    let mixRotate2 = getValue(nextMap, "mixRotate", 1);
                    let mixX2 = getValue(nextMap, "mixX", 1);
                    let mixY2 = getValue(nextMap, "mixY", mixX2);
                    let mixScaleX2 = getValue(nextMap, "mixScaleX", 1);
                    let mixScaleY2 = getValue(nextMap, "mixScaleY", mixScaleX2);
                    let mixShearY2 = getValue(nextMap, "mixShearY", 1);
                    let curve = keyMap.curve;
                    if (curve) {
                        bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, mixRotate, mixRotate2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, mixX, mixX2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, mixY, mixY2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 3, time, time2, mixScaleX, mixScaleX2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 4, time, time2, mixScaleY, mixScaleY2, 1);
                        bezier = readCurve(curve, timeline, bezier, frame, 5, time, time2, mixShearY, mixShearY2, 1);
                    }
                    time = time2;
                    mixRotate = mixRotate2;
                    mixX = mixX2;
                    mixY = mixY2;
                    mixScaleX = mixScaleX2;
                    mixScaleY = mixScaleY2;
                    mixScaleX = mixScaleX2;
                    keyMap = nextMap;
                }
                timelines.push(timeline);
            }
        }
        // Path constraint timelines.
        if (map.path) {
            for (let constraintName in map.path) {
                let constraintMap = map.path[constraintName];
                let constraint = skeletonData.findPathConstraint(constraintName);
                if (!constraint)
                    throw new Error("Path constraint not found: " + constraintName);
                let constraintIndex = skeletonData.pathConstraints.indexOf(constraint);
                for (let timelineName in constraintMap) {
                    let timelineMap = constraintMap[timelineName];
                    let keyMap = timelineMap[0];
                    if (!keyMap)
                        continue;
                    let frames = timelineMap.length;
                    if (timelineName === "position") {
                        let timeline = new PathConstraintPositionTimeline(frames, frames, constraintIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, constraint.positionMode == PositionMode.Fixed ? scale : 1));
                    }
                    else if (timelineName === "spacing") {
                        let timeline = new PathConstraintSpacingTimeline(frames, frames, constraintIndex);
                        timelines.push(readTimeline1(timelineMap, timeline, 0, constraint.spacingMode == SpacingMode.Length || constraint.spacingMode == SpacingMode.Fixed ? scale : 1));
                    }
                    else if (timelineName === "mix") {
                        let timeline = new PathConstraintMixTimeline(frames, frames * 3, constraintIndex);
                        let time = getValue(keyMap, "time", 0);
                        let mixRotate = getValue(keyMap, "mixRotate", 1);
                        let mixX = getValue(keyMap, "mixX", 1);
                        let mixY = getValue(keyMap, "mixY", mixX);
                        for (let frame = 0, bezier = 0;; frame++) {
                            timeline.setFrame(frame, time, mixRotate, mixX, mixY);
                            let nextMap = timelineMap[frame + 1];
                            if (!nextMap) {
                                timeline.shrink(bezier);
                                break;
                            }
                            let time2 = getValue(nextMap, "time", 0);
                            let mixRotate2 = getValue(nextMap, "mixRotate", 1);
                            let mixX2 = getValue(nextMap, "mixX", 1);
                            let mixY2 = getValue(nextMap, "mixY", mixX2);
                            let curve = keyMap.curve;
                            if (curve) {
                                bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, mixRotate, mixRotate2, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, mixX, mixX2, 1);
                                bezier = readCurve(curve, timeline, bezier, frame, 2, time, time2, mixY, mixY2, 1);
                            }
                            time = time2;
                            mixRotate = mixRotate2;
                            mixX = mixX2;
                            mixY = mixY2;
                            keyMap = nextMap;
                        }
                        timelines.push(timeline);
                    }
                }
            }
        }
        // Attachment timelines.
        if (map.attachments) {
            for (let attachmentsName in map.attachments) {
                let attachmentsMap = map.attachments[attachmentsName];
                let skin = skeletonData.findSkin(attachmentsName);
                if (!skin)
                    throw new Error("Skin not found: " + attachmentsName);
                for (let slotMapName in attachmentsMap) {
                    let slotMap = attachmentsMap[slotMapName];
                    let slot = skeletonData.findSlot(slotMapName);
                    if (!slot)
                        throw new Error("Slot not found: " + slotMapName);
                    let slotIndex = slot.index;
                    for (let attachmentMapName in slotMap) {
                        let attachmentMap = slotMap[attachmentMapName];
                        let attachment = skin.getAttachment(slotIndex, attachmentMapName);
                        for (let timelineMapName in attachmentMap) {
                            let timelineMap = attachmentMap[timelineMapName];
                            let keyMap = timelineMap[0];
                            if (!keyMap)
                                continue;
                            if (timelineMapName == "deform") {
                                let weighted = attachment.bones;
                                let vertices = attachment.vertices;
                                let deformLength = weighted ? vertices.length / 3 * 2 : vertices.length;
                                let timeline = new DeformTimeline(timelineMap.length, timelineMap.length, slotIndex, attachment);
                                let time = getValue(keyMap, "time", 0);
                                for (let frame = 0, bezier = 0;; frame++) {
                                    let deform;
                                    let verticesValue = getValue(keyMap, "vertices", null);
                                    if (!verticesValue)
                                        deform = weighted ? Utils.newFloatArray(deformLength) : vertices;
                                    else {
                                        deform = Utils.newFloatArray(deformLength);
                                        let start = getValue(keyMap, "offset", 0);
                                        Utils.arrayCopy(verticesValue, 0, deform, start, verticesValue.length);
                                        if (scale != 1) {
                                            for (let i = start, n = i + verticesValue.length; i < n; i++)
                                                deform[i] *= scale;
                                        }
                                        if (!weighted) {
                                            for (let i = 0; i < deformLength; i++)
                                                deform[i] += vertices[i];
                                        }
                                    }
                                    timeline.setFrame(frame, time, deform);
                                    let nextMap = timelineMap[frame + 1];
                                    if (!nextMap) {
                                        timeline.shrink(bezier);
                                        break;
                                    }
                                    let time2 = getValue(nextMap, "time", 0);
                                    let curve = keyMap.curve;
                                    if (curve)
                                        bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, 0, 1, 1);
                                    time = time2;
                                    keyMap = nextMap;
                                }
                                timelines.push(timeline);
                            }
                            else if (timelineMapName == "sequence") {
                                let timeline = new SequenceTimeline(timelineMap.length, slotIndex, attachment);
                                let lastDelay = 0;
                                for (let frame = 0; frame < timelineMap.length; frame++) {
                                    let delay = getValue(keyMap, "delay", lastDelay);
                                    let time = getValue(keyMap, "time", 0);
                                    let mode = SequenceMode[getValue(keyMap, "mode", "hold")];
                                    let index = getValue(keyMap, "index", 0);
                                    timeline.setFrame(frame, time, mode, index, delay);
                                    lastDelay = delay;
                                    keyMap = timelineMap[frame + 1];
                                }
                                timelines.push(timeline);
                            }
                        }
                    }
                }
            }
        }
        // Draw order timelines.
        if (map.drawOrder) {
            let timeline = new DrawOrderTimeline(map.drawOrder.length);
            let slotCount = skeletonData.slots.length;
            let frame = 0;
            for (let i = 0; i < map.drawOrder.length; i++, frame++) {
                let drawOrderMap = map.drawOrder[i];
                let drawOrder = null;
                let offsets = getValue(drawOrderMap, "offsets", null);
                if (offsets) {
                    drawOrder = Utils.newArray(slotCount, -1);
                    let unchanged = Utils.newArray(slotCount - offsets.length, 0);
                    let originalIndex = 0, unchangedIndex = 0;
                    for (let ii = 0; ii < offsets.length; ii++) {
                        let offsetMap = offsets[ii];
                        let slot = skeletonData.findSlot(offsetMap.slot);
                        if (!slot)
                            throw new Error("Slot not found: " + slot);
                        let slotIndex = slot.index;
                        // Collect unchanged items.
                        while (originalIndex != slotIndex)
                            unchanged[unchangedIndex++] = originalIndex++;
                        // Set changed items.
                        drawOrder[originalIndex + offsetMap.offset] = originalIndex++;
                    }
                    // Collect remaining unchanged items.
                    while (originalIndex < slotCount)
                        unchanged[unchangedIndex++] = originalIndex++;
                    // Fill in unchanged items.
                    for (let ii = slotCount - 1; ii >= 0; ii--)
                        if (drawOrder[ii] == -1)
                            drawOrder[ii] = unchanged[--unchangedIndex];
                }
                timeline.setFrame(frame, getValue(drawOrderMap, "time", 0), drawOrder);
            }
            timelines.push(timeline);
        }
        // Event timelines.
        if (map.events) {
            let timeline = new EventTimeline(map.events.length);
            let frame = 0;
            for (let i = 0; i < map.events.length; i++, frame++) {
                let eventMap = map.events[i];
                let eventData = skeletonData.findEvent(eventMap.name);
                if (!eventData)
                    throw new Error("Event not found: " + eventMap.name);
                let event = new Event(Utils.toSinglePrecision(getValue(eventMap, "time", 0)), eventData);
                event.intValue = getValue(eventMap, "int", eventData.intValue);
                event.floatValue = getValue(eventMap, "float", eventData.floatValue);
                event.stringValue = getValue(eventMap, "string", eventData.stringValue);
                if (event.data.audioPath) {
                    event.volume = getValue(eventMap, "volume", 1);
                    event.balance = getValue(eventMap, "balance", 0);
                }
                timeline.setFrame(frame, event);
            }
            timelines.push(timeline);
        }
        let duration = 0;
        for (let i = 0, n = timelines.length; i < n; i++)
            duration = Math.max(duration, timelines[i].getDuration());
        skeletonData.animations.push(new Animation(name, timelines, duration));
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
function readTimeline1(keys, timeline, defaultValue, scale) {
    let keyMap = keys[0];
    let time = getValue(keyMap, "time", 0);
    let value = getValue(keyMap, "value", defaultValue) * scale;
    let bezier = 0;
    for (let frame = 0;; frame++) {
        timeline.setFrame(frame, time, value);
        let nextMap = keys[frame + 1];
        if (!nextMap) {
            timeline.shrink(bezier);
            return timeline;
        }
        let time2 = getValue(nextMap, "time", 0);
        let value2 = getValue(nextMap, "value", defaultValue) * scale;
        if (keyMap.curve)
            bezier = readCurve(keyMap.curve, timeline, bezier, frame, 0, time, time2, value, value2, scale);
        time = time2;
        value = value2;
        keyMap = nextMap;
    }
}
function readTimeline2(keys, timeline, name1, name2, defaultValue, scale) {
    let keyMap = keys[0];
    let time = getValue(keyMap, "time", 0);
    let value1 = getValue(keyMap, name1, defaultValue) * scale;
    let value2 = getValue(keyMap, name2, defaultValue) * scale;
    let bezier = 0;
    for (let frame = 0;; frame++) {
        timeline.setFrame(frame, time, value1, value2);
        let nextMap = keys[frame + 1];
        if (!nextMap) {
            timeline.shrink(bezier);
            return timeline;
        }
        let time2 = getValue(nextMap, "time", 0);
        let nvalue1 = getValue(nextMap, name1, defaultValue) * scale;
        let nvalue2 = getValue(nextMap, name2, defaultValue) * scale;
        let curve = keyMap.curve;
        if (curve) {
            bezier = readCurve(curve, timeline, bezier, frame, 0, time, time2, value1, nvalue1, scale);
            bezier = readCurve(curve, timeline, bezier, frame, 1, time, time2, value2, nvalue2, scale);
        }
        time = time2;
        value1 = nvalue1;
        value2 = nvalue2;
        keyMap = nextMap;
    }
}
function readCurve(curve, timeline, bezier, frame, value, time1, time2, value1, value2, scale) {
    if (curve == "stepped") {
        timeline.setStepped(frame);
        return bezier;
    }
    let i = value << 2;
    let cx1 = curve[i];
    let cy1 = curve[i + 1] * scale;
    let cx2 = curve[i + 2];
    let cy2 = curve[i + 3] * scale;
    timeline.setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2);
    return bezier + 1;
}
function getValue(map, property, defaultValue) {
    return map[property] !== undefined ? map[property] : defaultValue;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2tlbGV0b25Kc29uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NrZWxldG9uSnNvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFFLFNBQVMsRUFBWSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsRUFBRSw4QkFBOEIsRUFBRSw2QkFBNkIsRUFBRSx5QkFBeUIsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFpRCxNQUFNLGFBQWEsQ0FBQztBQUlwaUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ2pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BFLE9BQU8s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R0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzdGLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ25GLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQ25GLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzdGLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzdGLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7cUJBQzdGO29CQUVELElBQUksR0FBRyxLQUFLLENBQUM7b0JBQ2IsU0FBUyxHQUFHLFVBQVUsQ0FBQztvQkFDdkIsSUFBSSxHQUFHLEtBQUssQ0FBQztvQkFDYixJQUFJLEdBQUcsS0FBSyxDQUFDO29CQUNiLFNB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