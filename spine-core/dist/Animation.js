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
import { VertexAttachment } from "./attachments/Attachment";
import { StringSet, Utils, MathUtils } from "./Utils";
import { SequenceMode, SequenceModeValues } from "./attachments/Sequence";
/** A simple container for a list of timelines and a name. */
export class Animation {
    constructor(name, timelines, duration) {
        this.timelines = [];
        this.timelineIds = new StringSet();
        if (!name)
            throw new Error("name cannot be null.");
        this.name = name;
        this.setTimelines(timelines);
        this.duration = duration;
    }
    setTimelines(timelines) {
        if (!timelines)
            throw new Error("timelines cannot be null.");
        this.timelines = timelines;
        this.timelineIds.clear();
        for (var i = 0; i < timelines.length; i++)
            this.timelineIds.addAll(timelines[i].getPropertyIds());
    }
    hasTimeline(ids) {
        for (let i = 0; i < ids.length; i++)
            if (this.timelineIds.contains(ids[i]))
                return true;
        return false;
    }
    /** Applies all the animation's timelines to the specified skeleton.
     *
     * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}.
     * @param loop If true, the animation repeats after {@link #getDuration()}.
     * @param events May be null to ignore fired events. */
    apply(skeleton, lastTime, time, loop, events, alpha, blend, direction) {
        if (!skeleton)
            throw new Error("skeleton cannot be null.");
        if (loop && this.duration != 0) {
            time %= this.duration;
            if (lastTime > 0)
                lastTime %= this.duration;
        }
        let timelines = this.timelines;
        for (let i = 0, n = timelines.length; i < n; i++)
            timelines[i].apply(skeleton, lastTime, time, events, alpha, blend, direction);
    }
}
/** Controls how a timeline value is mixed with the setup pose value or current pose value when a timeline's `alpha`
 * < 1.
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}. */
export var MixBlend;
(function (MixBlend) {
    /** Transitions from the setup value to the timeline value (the current value is not used). Before the first key, the setup
     * value is set. */
    MixBlend[MixBlend["setup"] = 0] = "setup";
    /** Transitions from the current value to the timeline value. Before the first key, transitions from the current value to
     * the setup value. Timelines which perform instant transitions, such as {@link DrawOrderTimeline} or
     * {@link AttachmentTimeline}, use the setup value before the first key.
     *
     * `first` is intended for the first animations applied, not for animations layered on top of those. */
    MixBlend[MixBlend["first"] = 1] = "first";
    /** Transitions from the current value to the timeline value. No change is made before the first key (the current value is
     * kept until the first key).
     *
     * `replace` is intended for animations layered on top of others, not for the first animations applied. */
    MixBlend[MixBlend["replace"] = 2] = "replace";
    /** Transitions from the current value to the current value plus the timeline value. No change is made before the first key
     * (the current value is kept until the first key).
     *
     * `add` is intended for animations layered on top of others, not for the first animations applied. Properties
     * keyed by additive animations must be set manually or by another animation before applying the additive animations, else
     * the property values will increase continually. */
    MixBlend[MixBlend["add"] = 3] = "add";
})(MixBlend || (MixBlend = {}));
/** Indicates whether a timeline's `alpha` is mixing out over time toward 0 (the setup or current pose value) or
 * mixing in toward 1 (the timeline's value).
 *
 * See Timeline {@link Timeline#apply(Skeleton, float, float, Array, float, MixBlend, MixDirection)}. */
export var MixDirection;
(function (MixDirection) {
    MixDirection[MixDirection["mixIn"] = 0] = "mixIn";
    MixDirection[MixDirection["mixOut"] = 1] = "mixOut";
})(MixDirection || (MixDirection = {}));
const Property = {
    rotate: 0,
    x: 1,
    y: 2,
    scaleX: 3,
    scaleY: 4,
    shearX: 5,
    shearY: 6,
    rgb: 7,
    alpha: 8,
    rgb2: 9,
    attachment: 10,
    deform: 11,
    event: 12,
    drawOrder: 13,
    ikConstraint: 14,
    transformConstraint: 15,
    pathConstraintPosition: 16,
    pathConstraintSpacing: 17,
    pathConstraintMix: 18,
    sequence: 19
};
/** The interface for all timelines. */
export class Timeline {
    constructor(frameCount, propertyIds) {
        this.propertyIds = propertyIds;
        this.frames = Utils.newFloatArray(frameCount * this.getFrameEntries());
    }
    getPropertyIds() {
        return this.propertyIds;
    }
    getFrameEntries() {
        return 1;
    }
    getFrameCount() {
        return this.frames.length / this.getFrameEntries();
    }
    getDuration() {
        return this.frames[this.frames.length - this.getFrameEntries()];
    }
    static search1(frames, time) {
        let n = frames.length;
        for (let i = 1; i < n; i++)
            if (frames[i] > time)
                return i - 1;
        return n - 1;
    }
    static search(frames, time, step) {
        let n = frames.length;
        for (let i = step; i < n; i += step)
            if (frames[i] > time)
                return i - step;
        return n - step;
    }
}
/** The base class for timelines that use interpolation between key frame values. */
export class CurveTimeline extends Timeline {
    constructor(frameCount, bezierCount, propertyIds) {
        super(frameCount, propertyIds);
        this.curves = Utils.newFloatArray(frameCount + bezierCount * 18 /*BEZIER_SIZE*/);
        this.curves[frameCount - 1] = 1 /*STEPPED*/;
    }
    /** Sets the specified key frame to linear interpolation. */
    setLinear(frame) {
        this.curves[frame] = 0 /*LINEAR*/;
    }
    /** Sets the specified key frame to stepped interpolation. */
    setStepped(frame) {
        this.curves[frame] = 1 /*STEPPED*/;
    }
    /** Shrinks the storage for Bezier curves, for use when <code>bezierCount</code> (specified in the constructor) was larger
     * than the actual number of Bezier curves. */
    shrink(bezierCount) {
        let size = this.getFrameCount() + bezierCount * 18 /*BEZIER_SIZE*/;
        if (this.curves.length > size) {
            let newCurves = Utils.newFloatArray(size);
            Utils.arrayCopy(this.curves, 0, newCurves, 0, size);
            this.curves = newCurves;
        }
    }
    /** Stores the segments for the specified Bezier curve. For timelines that modify multiple values, there may be more than
     * one curve per frame.
     * @param bezier The ordinal of this Bezier curve for this timeline, between 0 and <code>bezierCount - 1</code> (specified
     *           in the constructor), inclusive.
     * @param frame Between 0 and <code>frameCount - 1</code>, inclusive.
     * @param value The index of the value for this frame that this curve is used for.
     * @param time1 The time for the first key.
     * @param value1 The value for the first key.
     * @param cx1 The time for the first Bezier handle.
     * @param cy1 The value for the first Bezier handle.
     * @param cx2 The time of the second Bezier handle.
     * @param cy2 The value for the second Bezier handle.
     * @param time2 The time for the second key.
     * @param value2 The value for the second key. */
    setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2) {
        let curves = this.curves;
        let i = this.getFrameCount() + bezier * 18 /*BEZIER_SIZE*/;
        if (value == 0)
            curves[frame] = 2 /*BEZIER*/ + i;
        let tmpx = (time1 - cx1 * 2 + cx2) * 0.03, tmpy = (value1 - cy1 * 2 + cy2) * 0.03;
        let dddx = ((cx1 - cx2) * 3 - time1 + time2) * 0.006, dddy = ((cy1 - cy2) * 3 - value1 + value2) * 0.006;
        let ddx = tmpx * 2 + dddx, ddy = tmpy * 2 + dddy;
        let dx = (cx1 - time1) * 0.3 + tmpx + dddx * 0.16666667, dy = (cy1 - value1) * 0.3 + tmpy + dddy * 0.16666667;
        let x = time1 + dx, y = value1 + dy;
        for (let n = i + 18 /*BEZIER_SIZE*/; i < n; i += 2) {
            curves[i] = x;
            curves[i + 1] = y;
            dx += ddx;
            dy += ddy;
            ddx += dddx;
            ddy += dddy;
            x += dx;
            y += dy;
        }
    }
    /** Returns the Bezier interpolated value for the specified time.
     * @param frameIndex The index into {@link #getFrames()} for the values of the frame before <code>time</code>.
     * @param valueOffset The offset from <code>frameIndex</code> to the value this curve is used for.
     * @param i The index of the Bezier segments. See {@link #getCurveType(int)}. */
    getBezierValue(time, frameIndex, valueOffset, i) {
        let curves = this.curves;
        if (curves[i] > time) {
            let x = this.frames[frameIndex], y = this.frames[frameIndex + valueOffset];
            return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
        }
        let n = i + 18 /*BEZIER_SIZE*/;
        for (i += 2; i < n; i += 2) {
            if (curves[i] >= time) {
                let x = curves[i - 2], y = curves[i - 1];
                return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
            }
        }
        frameIndex += this.getFrameEntries();
        let x = curves[n - 2], y = curves[n - 1];
        return y + (time - x) / (this.frames[frameIndex] - x) * (this.frames[frameIndex + valueOffset] - y);
    }
}
export class CurveTimeline1 extends CurveTimeline {
    constructor(frameCount, bezierCount, propertyId) {
        super(frameCount, bezierCount, [propertyId]);
    }
    getFrameEntries() {
        return 2 /*ENTRIES*/;
    }
    /** Sets the time and value for the specified frame.
     * @param frame Between 0 and <code>frameCount</code>, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, value) {
        frame <<= 1;
        this.frames[frame] = time;
        this.frames[frame + 1 /*VALUE*/] = value;
    }
    /** Returns the interpolated value for the specified time. */
    getCurveValue(time) {
        let frames = this.frames;
        let i = frames.length - 2;
        for (let ii = 2; ii <= i; ii += 2) {
            if (frames[ii] > time) {
                i = ii - 2;
                break;
            }
        }
        let curveType = this.curves[i >> 1];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i], value = frames[i + 1 /*VALUE*/];
                return value + (time - before) / (frames[i + 2 /*ENTRIES*/] - before) * (frames[i + 2 /*ENTRIES*/ + 1 /*VALUE*/] - value);
            case 1 /*STEPPED*/:
                return frames[i + 1 /*VALUE*/];
        }
        return this.getBezierValue(time, i, 1 /*VALUE*/, curveType - 2 /*BEZIER*/);
    }
}
/** The base class for a {@link CurveTimeline} which sets two properties. */
export class CurveTimeline2 extends CurveTimeline {
    /** @param bezierCount The maximum number of Bezier curves. See {@link #shrink(int)}.
     * @param propertyIds Unique identifiers for the properties the timeline modifies. */
    constructor(frameCount, bezierCount, propertyId1, propertyId2) {
        super(frameCount, bezierCount, [propertyId1, propertyId2]);
    }
    getFrameEntries() {
        return 3 /*ENTRIES*/;
    }
    /** Sets the time and values for the specified frame.
     * @param frame Between 0 and <code>frameCount</code>, inclusive.
     * @param time The frame time in seconds. */
    setFrame(frame, time, value1, value2) {
        frame *= 3 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*VALUE1*/] = value1;
        this.frames[frame + 2 /*VALUE2*/] = value2;
    }
}
/** Changes a bone's local {@link Bone#rotation}. */
export class RotateTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.rotate + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.rotation = bone.data.rotation;
                    return;
                case MixBlend.first:
                    bone.rotation += (bone.data.rotation - bone.rotation) * alpha;
            }
            return;
        }
        let r = this.getCurveValue(time);
        switch (blend) {
            case MixBlend.setup:
                bone.rotation = bone.data.rotation + r * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                r += bone.data.rotation - bone.rotation;
            case MixBlend.add:
                bone.rotation += r * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#x} and {@link Bone#y}. */
export class TranslateTimeline extends CurveTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.x + "|" + boneIndex, Property.y + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.x = bone.data.x;
                    bone.y = bone.data.y;
                    return;
                case MixBlend.first:
                    bone.x += (bone.data.x - bone.x) * alpha;
                    bone.y += (bone.data.y - bone.y) * alpha;
            }
            return;
        }
        let x = 0, y = 0;
        let i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        let curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                let t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        switch (blend) {
            case MixBlend.setup:
                bone.x = bone.data.x + x * alpha;
                bone.y = bone.data.y + y * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.x += (bone.data.x + x - bone.x) * alpha;
                bone.y += (bone.data.y + y - bone.y) * alpha;
                break;
            case MixBlend.add:
                bone.x += x * alpha;
                bone.y += y * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#x}. */
export class TranslateXTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.x + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.x = bone.data.x;
                    return;
                case MixBlend.first:
                    bone.x += (bone.data.x - bone.x) * alpha;
            }
            return;
        }
        let x = this.getCurveValue(time);
        switch (blend) {
            case MixBlend.setup:
                bone.x = bone.data.x + x * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.x += (bone.data.x + x - bone.x) * alpha;
                break;
            case MixBlend.add:
                bone.x += x * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#x}. */
export class TranslateYTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.y + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.y = bone.data.y;
                    return;
                case MixBlend.first:
                    bone.y += (bone.data.y - bone.y) * alpha;
            }
            return;
        }
        let y = this.getCurveValue(time);
        switch (blend) {
            case MixBlend.setup:
                bone.y = bone.data.y + y * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.y += (bone.data.y + y - bone.y) * alpha;
                break;
            case MixBlend.add:
                bone.y += y * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#scaleX)} and {@link Bone#scaleY}. */
export class ScaleTimeline extends CurveTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.scaleX + "|" + boneIndex, Property.scaleY + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.scaleX = bone.data.scaleX;
                    bone.scaleY = bone.data.scaleY;
                    return;
                case MixBlend.first:
                    bone.scaleX += (bone.data.scaleX - bone.scaleX) * alpha;
                    bone.scaleY += (bone.data.scaleY - bone.scaleY) * alpha;
            }
            return;
        }
        let x, y;
        let i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        let curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                let t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        x *= bone.data.scaleX;
        y *= bone.data.scaleY;
        if (alpha == 1) {
            if (blend == MixBlend.add) {
                bone.scaleX += x - bone.data.scaleX;
                bone.scaleY += y - bone.data.scaleY;
            }
            else {
                bone.scaleX = x;
                bone.scaleY = y;
            }
        }
        else {
            let bx = 0, by = 0;
            if (direction == MixDirection.mixOut) {
                switch (blend) {
                    case MixBlend.setup:
                        bx = bone.data.scaleX;
                        by = bone.data.scaleY;
                        bone.scaleX = bx + (Math.abs(x) * MathUtils.signum(bx) - bx) * alpha;
                        bone.scaleY = by + (Math.abs(y) * MathUtils.signum(by) - by) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        bx = bone.scaleX;
                        by = bone.scaleY;
                        bone.scaleX = bx + (Math.abs(x) * MathUtils.signum(bx) - bx) * alpha;
                        bone.scaleY = by + (Math.abs(y) * MathUtils.signum(by) - by) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleX += (x - bone.data.scaleX) * alpha;
                        bone.scaleY += (y - bone.data.scaleY) * alpha;
                }
            }
            else {
                switch (blend) {
                    case MixBlend.setup:
                        bx = Math.abs(bone.data.scaleX) * MathUtils.signum(x);
                        by = Math.abs(bone.data.scaleY) * MathUtils.signum(y);
                        bone.scaleX = bx + (x - bx) * alpha;
                        bone.scaleY = by + (y - by) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        bx = Math.abs(bone.scaleX) * MathUtils.signum(x);
                        by = Math.abs(bone.scaleY) * MathUtils.signum(y);
                        bone.scaleX = bx + (x - bx) * alpha;
                        bone.scaleY = by + (y - by) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleX += (x - bone.data.scaleX) * alpha;
                        bone.scaleY += (y - bone.data.scaleY) * alpha;
                }
            }
        }
    }
}
/** Changes a bone's local {@link Bone#scaleX)} and {@link Bone#scaleY}. */
export class ScaleXTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.scaleX + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.scaleX = bone.data.scaleX;
                    return;
                case MixBlend.first:
                    bone.scaleX += (bone.data.scaleX - bone.scaleX) * alpha;
            }
            return;
        }
        let x = this.getCurveValue(time) * bone.data.scaleX;
        if (alpha == 1) {
            if (blend == MixBlend.add)
                bone.scaleX += x - bone.data.scaleX;
            else
                bone.scaleX = x;
        }
        else {
            // Mixing out uses sign of setup or current pose, else use sign of key.
            let bx = 0;
            if (direction == MixDirection.mixOut) {
                switch (blend) {
                    case MixBlend.setup:
                        bx = bone.data.scaleX;
                        bone.scaleX = bx + (Math.abs(x) * MathUtils.signum(bx) - bx) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        bx = bone.scaleX;
                        bone.scaleX = bx + (Math.abs(x) * MathUtils.signum(bx) - bx) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleX += (x - bone.data.scaleX) * alpha;
                }
            }
            else {
                switch (blend) {
                    case MixBlend.setup:
                        bx = Math.abs(bone.data.scaleX) * MathUtils.signum(x);
                        bone.scaleX = bx + (x - bx) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        bx = Math.abs(bone.scaleX) * MathUtils.signum(x);
                        bone.scaleX = bx + (x - bx) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleX += (x - bone.data.scaleX) * alpha;
                }
            }
        }
    }
}
/** Changes a bone's local {@link Bone#scaleX)} and {@link Bone#scaleY}. */
export class ScaleYTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.scaleY + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.scaleY = bone.data.scaleY;
                    return;
                case MixBlend.first:
                    bone.scaleY += (bone.data.scaleY - bone.scaleY) * alpha;
            }
            return;
        }
        let y = this.getCurveValue(time) * bone.data.scaleY;
        if (alpha == 1) {
            if (blend == MixBlend.add)
                bone.scaleY += y - bone.data.scaleY;
            else
                bone.scaleY = y;
        }
        else {
            // Mixing out uses sign of setup or current pose, else use sign of key.
            let by = 0;
            if (direction == MixDirection.mixOut) {
                switch (blend) {
                    case MixBlend.setup:
                        by = bone.data.scaleY;
                        bone.scaleY = by + (Math.abs(y) * MathUtils.signum(by) - by) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        by = bone.scaleY;
                        bone.scaleY = by + (Math.abs(y) * MathUtils.signum(by) - by) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleY += (y - bone.data.scaleY) * alpha;
                }
            }
            else {
                switch (blend) {
                    case MixBlend.setup:
                        by = Math.abs(bone.data.scaleY) * MathUtils.signum(y);
                        bone.scaleY = by + (y - by) * alpha;
                        break;
                    case MixBlend.first:
                    case MixBlend.replace:
                        by = Math.abs(bone.scaleY) * MathUtils.signum(y);
                        bone.scaleY = by + (y - by) * alpha;
                        break;
                    case MixBlend.add:
                        bone.scaleY += (y - bone.data.scaleY) * alpha;
                }
            }
        }
    }
}
/** Changes a bone's local {@link Bone#shearX} and {@link Bone#shearY}. */
export class ShearTimeline extends CurveTimeline2 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.shearX + "|" + boneIndex, Property.shearY + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.shearX = bone.data.shearX;
                    bone.shearY = bone.data.shearY;
                    return;
                case MixBlend.first:
                    bone.shearX += (bone.data.shearX - bone.shearX) * alpha;
                    bone.shearY += (bone.data.shearY - bone.shearY) * alpha;
            }
            return;
        }
        let x = 0, y = 0;
        let i = Timeline.search(frames, time, 3 /*ENTRIES*/);
        let curveType = this.curves[i / 3 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                let t = (time - before) / (frames[i + 3 /*ENTRIES*/] - before);
                x += (frames[i + 3 /*ENTRIES*/ + 1 /*VALUE1*/] - x) * t;
                y += (frames[i + 3 /*ENTRIES*/ + 2 /*VALUE2*/] - y) * t;
                break;
            case 1 /*STEPPED*/:
                x = frames[i + 1 /*VALUE1*/];
                y = frames[i + 2 /*VALUE2*/];
                break;
            default:
                x = this.getBezierValue(time, i, 1 /*VALUE1*/, curveType - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 2 /*VALUE2*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        switch (blend) {
            case MixBlend.setup:
                bone.shearX = bone.data.shearX + x * alpha;
                bone.shearY = bone.data.shearY + y * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.shearX += (bone.data.shearX + x - bone.shearX) * alpha;
                bone.shearY += (bone.data.shearY + y - bone.shearY) * alpha;
                break;
            case MixBlend.add:
                bone.shearX += x * alpha;
                bone.shearY += y * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#shearX} and {@link Bone#shearY}. */
export class ShearXTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.shearX + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.shearX = bone.data.shearX;
                    return;
                case MixBlend.first:
                    bone.shearX += (bone.data.shearX - bone.shearX) * alpha;
            }
            return;
        }
        let x = this.getCurveValue(time);
        switch (blend) {
            case MixBlend.setup:
                bone.shearX = bone.data.shearX + x * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.shearX += (bone.data.shearX + x - bone.shearX) * alpha;
                break;
            case MixBlend.add:
                bone.shearX += x * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#shearX} and {@link Bone#shearY}. */
export class ShearYTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, boneIndex) {
        super(frameCount, bezierCount, Property.shearY + "|" + boneIndex);
        this.boneIndex = 0;
        this.boneIndex = boneIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let bone = skeleton.bones[this.boneIndex];
        if (!bone.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    bone.shearY = bone.data.shearY;
                    return;
                case MixBlend.first:
                    bone.shearY += (bone.data.shearY - bone.shearY) * alpha;
            }
            return;
        }
        let y = this.getCurveValue(time);
        switch (blend) {
            case MixBlend.setup:
                bone.shearY = bone.data.shearY + y * alpha;
                break;
            case MixBlend.first:
            case MixBlend.replace:
                bone.shearY += (bone.data.shearY + y - bone.shearY) * alpha;
                break;
            case MixBlend.add:
                bone.shearY += y * alpha;
        }
    }
}
/** Changes a slot's {@link Slot#color}. */
export class RGBATimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, [
            Property.rgb + "|" + slotIndex,
            Property.alpha + "|" + slotIndex
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
    }
    getFrameEntries() {
        return 5 /*ENTRIES*/;
    }
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame, time, r, g, b, a) {
        frame *= 5 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*A*/] = a;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let frames = this.frames;
        let color = slot.color;
        if (time < frames[0]) {
            let setup = slot.data.color;
            switch (blend) {
                case MixBlend.setup:
                    color.setFromColor(setup);
                    return;
                case MixBlend.first:
                    color.add((setup.r - color.r) * alpha, (setup.g - color.g) * alpha, (setup.b - color.b) * alpha, (setup.a - color.a) * alpha);
            }
            return;
        }
        let r = 0, g = 0, b = 0, a = 0;
        let i = Timeline.search(frames, time, 5 /*ENTRIES*/);
        let curveType = this.curves[i / 5 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                let t = (time - before) / (frames[i + 5 /*ENTRIES*/] - before);
                r += (frames[i + 5 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 5 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 5 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                a += (frames[i + 5 /*ENTRIES*/ + 4 /*A*/] - a) * t;
                break;
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                a = this.getBezierValue(time, i, 4 /*A*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
        }
        if (alpha == 1)
            color.set(r, g, b, a);
        else {
            if (blend == MixBlend.setup)
                color.setFromColor(slot.data.color);
            color.add((r - color.r) * alpha, (g - color.g) * alpha, (b - color.b) * alpha, (a - color.a) * alpha);
        }
    }
}
/** Changes a slot's {@link Slot#color}. */
export class RGBTimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, [
            Property.rgb + "|" + slotIndex
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
    }
    getFrameEntries() {
        return 4 /*ENTRIES*/;
    }
    /** Sets the time in seconds, red, green, blue, and alpha for the specified key frame. */
    setFrame(frame, time, r, g, b) {
        frame <<= 2;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let frames = this.frames;
        let color = slot.color;
        if (time < frames[0]) {
            let setup = slot.data.color;
            switch (blend) {
                case MixBlend.setup:
                    color.r = setup.r;
                    color.g = setup.g;
                    color.b = setup.b;
                    return;
                case MixBlend.first:
                    color.r += (setup.r - color.r) * alpha;
                    color.g += (setup.g - color.g) * alpha;
                    color.b += (setup.b - color.b) * alpha;
            }
            return;
        }
        let r = 0, g = 0, b = 0;
        let i = Timeline.search(frames, time, 4 /*ENTRIES*/);
        let curveType = this.curves[i >> 2];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                let t = (time - before) / (frames[i + 4 /*ENTRIES*/] - before);
                r += (frames[i + 4 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 4 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 4 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                break;
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
        }
        if (alpha == 1) {
            color.r = r;
            color.g = g;
            color.b = b;
        }
        else {
            if (blend == MixBlend.setup) {
                let setup = slot.data.color;
                color.r = setup.r;
                color.g = setup.g;
                color.b = setup.b;
            }
            color.r += (r - color.r) * alpha;
            color.g += (g - color.g) * alpha;
            color.b += (b - color.b) * alpha;
        }
    }
}
/** Changes a bone's local {@link Bone#shearX} and {@link Bone#shearY}. */
export class AlphaTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, Property.alpha + "|" + slotIndex);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let color = slot.color;
        if (time < this.frames[0]) { // Time is before first frame.
            let setup = slot.data.color;
            switch (blend) {
                case MixBlend.setup:
                    color.a = setup.a;
                    return;
                case MixBlend.first:
                    color.a += (setup.a - color.a) * alpha;
            }
            return;
        }
        let a = this.getCurveValue(time);
        if (alpha == 1)
            color.a = a;
        else {
            if (blend == MixBlend.setup)
                color.a = slot.data.color.a;
            color.a += (a - color.a) * alpha;
        }
    }
}
/** Changes a slot's {@link Slot#color} and {@link Slot#darkColor} for two color tinting. */
export class RGBA2Timeline extends CurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, [
            Property.rgb + "|" + slotIndex,
            Property.alpha + "|" + slotIndex,
            Property.rgb2 + "|" + slotIndex
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
    }
    getFrameEntries() {
        return 8 /*ENTRIES*/;
    }
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame, time, r, g, b, a, r2, g2, b2) {
        frame <<= 3;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*A*/] = a;
        this.frames[frame + 5 /*R2*/] = r2;
        this.frames[frame + 6 /*G2*/] = g2;
        this.frames[frame + 7 /*B2*/] = b2;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let frames = this.frames;
        let light = slot.color, dark = slot.darkColor;
        if (time < frames[0]) {
            let setupLight = slot.data.color, setupDark = slot.data.darkColor;
            switch (blend) {
                case MixBlend.setup:
                    light.setFromColor(setupLight);
                    dark.r = setupDark.r;
                    dark.g = setupDark.g;
                    dark.b = setupDark.b;
                    return;
                case MixBlend.first:
                    light.add((setupLight.r - light.r) * alpha, (setupLight.g - light.g) * alpha, (setupLight.b - light.b) * alpha, (setupLight.a - light.a) * alpha);
                    dark.r += (setupDark.r - dark.r) * alpha;
                    dark.g += (setupDark.g - dark.g) * alpha;
                    dark.b += (setupDark.b - dark.b) * alpha;
            }
            return;
        }
        let r = 0, g = 0, b = 0, a = 0, r2 = 0, g2 = 0, b2 = 0;
        let i = Timeline.search(frames, time, 8 /*ENTRIES*/);
        let curveType = this.curves[i >> 3];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                r2 = frames[i + 5 /*R2*/];
                g2 = frames[i + 6 /*G2*/];
                b2 = frames[i + 7 /*B2*/];
                let t = (time - before) / (frames[i + 8 /*ENTRIES*/] - before);
                r += (frames[i + 8 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 8 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 8 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                a += (frames[i + 8 /*ENTRIES*/ + 4 /*A*/] - a) * t;
                r2 += (frames[i + 8 /*ENTRIES*/ + 5 /*R2*/] - r2) * t;
                g2 += (frames[i + 8 /*ENTRIES*/ + 6 /*G2*/] - g2) * t;
                b2 += (frames[i + 8 /*ENTRIES*/ + 7 /*B2*/] - b2) * t;
                break;
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                a = frames[i + 4 /*A*/];
                r2 = frames[i + 5 /*R2*/];
                g2 = frames[i + 6 /*G2*/];
                b2 = frames[i + 7 /*B2*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                a = this.getBezierValue(time, i, 4 /*A*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                r2 = this.getBezierValue(time, i, 5 /*R2*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                g2 = this.getBezierValue(time, i, 6 /*G2*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
                b2 = this.getBezierValue(time, i, 7 /*B2*/, curveType + 18 /*BEZIER_SIZE*/ * 6 - 2 /*BEZIER*/);
        }
        if (alpha == 1) {
            light.set(r, g, b, a);
            dark.r = r2;
            dark.g = g2;
            dark.b = b2;
        }
        else {
            if (blend == MixBlend.setup) {
                light.setFromColor(slot.data.color);
                let setupDark = slot.data.darkColor;
                dark.r = setupDark.r;
                dark.g = setupDark.g;
                dark.b = setupDark.b;
            }
            light.add((r - light.r) * alpha, (g - light.g) * alpha, (b - light.b) * alpha, (a - light.a) * alpha);
            dark.r += (r2 - dark.r) * alpha;
            dark.g += (g2 - dark.g) * alpha;
            dark.b += (b2 - dark.b) * alpha;
        }
    }
}
/** Changes a slot's {@link Slot#color} and {@link Slot#darkColor} for two color tinting. */
export class RGB2Timeline extends CurveTimeline {
    constructor(frameCount, bezierCount, slotIndex) {
        super(frameCount, bezierCount, [
            Property.rgb + "|" + slotIndex,
            Property.rgb2 + "|" + slotIndex
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
    }
    getFrameEntries() {
        return 7 /*ENTRIES*/;
    }
    /** Sets the time in seconds, light, and dark colors for the specified key frame. */
    setFrame(frame, time, r, g, b, r2, g2, b2) {
        frame *= 7 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*R*/] = r;
        this.frames[frame + 2 /*G*/] = g;
        this.frames[frame + 3 /*B*/] = b;
        this.frames[frame + 4 /*R2*/] = r2;
        this.frames[frame + 5 /*G2*/] = g2;
        this.frames[frame + 6 /*B2*/] = b2;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let frames = this.frames;
        let light = slot.color, dark = slot.darkColor;
        if (time < frames[0]) {
            let setupLight = slot.data.color, setupDark = slot.data.darkColor;
            switch (blend) {
                case MixBlend.setup:
                    light.r = setupLight.r;
                    light.g = setupLight.g;
                    light.b = setupLight.b;
                    dark.r = setupDark.r;
                    dark.g = setupDark.g;
                    dark.b = setupDark.b;
                    return;
                case MixBlend.first:
                    light.r += (setupLight.r - light.r) * alpha;
                    light.g += (setupLight.g - light.g) * alpha;
                    light.b += (setupLight.b - light.b) * alpha;
                    dark.r += (setupDark.r - dark.r) * alpha;
                    dark.g += (setupDark.g - dark.g) * alpha;
                    dark.b += (setupDark.b - dark.b) * alpha;
            }
            return;
        }
        let r = 0, g = 0, b = 0, a = 0, r2 = 0, g2 = 0, b2 = 0;
        let i = Timeline.search(frames, time, 7 /*ENTRIES*/);
        let curveType = this.curves[i / 7 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                r2 = frames[i + 4 /*R2*/];
                g2 = frames[i + 5 /*G2*/];
                b2 = frames[i + 6 /*B2*/];
                let t = (time - before) / (frames[i + 7 /*ENTRIES*/] - before);
                r += (frames[i + 7 /*ENTRIES*/ + 1 /*R*/] - r) * t;
                g += (frames[i + 7 /*ENTRIES*/ + 2 /*G*/] - g) * t;
                b += (frames[i + 7 /*ENTRIES*/ + 3 /*B*/] - b) * t;
                r2 += (frames[i + 7 /*ENTRIES*/ + 4 /*R2*/] - r2) * t;
                g2 += (frames[i + 7 /*ENTRIES*/ + 5 /*G2*/] - g2) * t;
                b2 += (frames[i + 7 /*ENTRIES*/ + 6 /*B2*/] - b2) * t;
                break;
            case 1 /*STEPPED*/:
                r = frames[i + 1 /*R*/];
                g = frames[i + 2 /*G*/];
                b = frames[i + 3 /*B*/];
                r2 = frames[i + 4 /*R2*/];
                g2 = frames[i + 5 /*G2*/];
                b2 = frames[i + 6 /*B2*/];
                break;
            default:
                r = this.getBezierValue(time, i, 1 /*R*/, curveType - 2 /*BEZIER*/);
                g = this.getBezierValue(time, i, 2 /*G*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                b = this.getBezierValue(time, i, 3 /*B*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                r2 = this.getBezierValue(time, i, 4 /*R2*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                g2 = this.getBezierValue(time, i, 5 /*G2*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                b2 = this.getBezierValue(time, i, 6 /*B2*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
        }
        if (alpha == 1) {
            light.r = r;
            light.g = g;
            light.b = b;
            dark.r = r2;
            dark.g = g2;
            dark.b = b2;
        }
        else {
            if (blend == MixBlend.setup) {
                let setupLight = slot.data.color, setupDark = slot.data.darkColor;
                light.r = setupLight.r;
                light.g = setupLight.g;
                light.b = setupLight.b;
                dark.r = setupDark.r;
                dark.g = setupDark.g;
                dark.b = setupDark.b;
            }
            light.r += (r - light.r) * alpha;
            light.g += (g - light.g) * alpha;
            light.b += (b - light.b) * alpha;
            dark.r += (r2 - dark.r) * alpha;
            dark.g += (g2 - dark.g) * alpha;
            dark.b += (b2 - dark.b) * alpha;
        }
    }
}
/** Changes a slot's {@link Slot#attachment}. */
export class AttachmentTimeline extends Timeline {
    constructor(frameCount, slotIndex) {
        super(frameCount, [
            Property.attachment + "|" + slotIndex
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
        this.attachmentNames = new Array(frameCount);
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the attachment name for the specified key frame. */
    setFrame(frame, time, attachmentName) {
        this.frames[frame] = time;
        this.attachmentNames[frame] = attachmentName;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        if (direction == MixDirection.mixOut) {
            if (blend == MixBlend.setup)
                this.setAttachment(skeleton, slot, slot.data.attachmentName);
            return;
        }
        if (time < this.frames[0]) {
            if (blend == MixBlend.setup || blend == MixBlend.first)
                this.setAttachment(skeleton, slot, slot.data.attachmentName);
            return;
        }
        this.setAttachment(skeleton, slot, this.attachmentNames[Timeline.search1(this.frames, time)]);
    }
    setAttachment(skeleton, slot, attachmentName) {
        slot.setAttachment(!attachmentName ? null : skeleton.getAttachment(this.slotIndex, attachmentName));
    }
}
/** Changes a slot's {@link Slot#deform} to deform a {@link VertexAttachment}. */
export class DeformTimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, slotIndex, attachment) {
        super(frameCount, bezierCount, [
            Property.deform + "|" + slotIndex + "|" + attachment.id
        ]);
        this.slotIndex = 0;
        this.slotIndex = slotIndex;
        this.attachment = attachment;
        this.vertices = new Array(frameCount);
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the vertices for the specified key frame.
     * @param vertices Vertex positions for an unweighted VertexAttachment, or deform offsets if it has weights. */
    setFrame(frame, time, vertices) {
        this.frames[frame] = time;
        this.vertices[frame] = vertices;
    }
    /** @param value1 Ignored (0 is used for a deform timeline).
     * @param value2 Ignored (1 is used for a deform timeline). */
    setBezier(bezier, frame, value, time1, value1, cx1, cy1, cx2, cy2, time2, value2) {
        let curves = this.curves;
        let i = this.getFrameCount() + bezier * 18 /*BEZIER_SIZE*/;
        if (value == 0)
            curves[frame] = 2 /*BEZIER*/ + i;
        let tmpx = (time1 - cx1 * 2 + cx2) * 0.03, tmpy = cy2 * 0.03 - cy1 * 0.06;
        let dddx = ((cx1 - cx2) * 3 - time1 + time2) * 0.006, dddy = (cy1 - cy2 + 0.33333333) * 0.018;
        let ddx = tmpx * 2 + dddx, ddy = tmpy * 2 + dddy;
        let dx = (cx1 - time1) * 0.3 + tmpx + dddx * 0.16666667, dy = cy1 * 0.3 + tmpy + dddy * 0.16666667;
        let x = time1 + dx, y = dy;
        for (let n = i + 18 /*BEZIER_SIZE*/; i < n; i += 2) {
            curves[i] = x;
            curves[i + 1] = y;
            dx += ddx;
            dy += ddy;
            ddx += dddx;
            ddy += dddy;
            x += dx;
            y += dy;
        }
    }
    getCurvePercent(time, frame) {
        let curves = this.curves;
        let i = curves[frame];
        switch (i) {
            case 0 /*LINEAR*/:
                let x = this.frames[frame];
                return (time - x) / (this.frames[frame + this.getFrameEntries()] - x);
            case 1 /*STEPPED*/:
                return 0;
        }
        i -= 2 /*BEZIER*/;
        if (curves[i] > time) {
            let x = this.frames[frame];
            return curves[i + 1] * (time - x) / (curves[i] - x);
        }
        let n = i + 18 /*BEZIER_SIZE*/;
        for (i += 2; i < n; i += 2) {
            if (curves[i] >= time) {
                let x = curves[i - 2], y = curves[i - 1];
                return y + (time - x) / (curves[i] - x) * (curves[i + 1] - y);
            }
        }
        let x = curves[n - 2], y = curves[n - 1];
        return y + (1 - y) * (time - x) / (this.frames[frame + this.getFrameEntries()] - x);
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let slotAttachment = slot.getAttachment();
        if (!slotAttachment)
            return;
        if (!(slotAttachment instanceof VertexAttachment) || slotAttachment.timelineAttachment != this.attachment)
            return;
        let deform = slot.deform;
        if (deform.length == 0)
            blend = MixBlend.setup;
        let vertices = this.vertices;
        let vertexCount = vertices[0].length;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    deform.length = 0;
                    return;
                case MixBlend.first:
                    if (alpha == 1) {
                        deform.length = 0;
                        return;
                    }
                    deform.length = vertexCount;
                    let vertexAttachment = slotAttachment;
                    if (!vertexAttachment.bones) {
                        // Unweighted vertex positions.
                        let setupVertices = vertexAttachment.vertices;
                        for (var i = 0; i < vertexCount; i++)
                            deform[i] += (setupVertices[i] - deform[i]) * alpha;
                    }
                    else {
                        // Weighted deform offsets.
                        alpha = 1 - alpha;
                        for (var i = 0; i < vertexCount; i++)
                            deform[i] *= alpha;
                    }
            }
            return;
        }
        deform.length = vertexCount;
        if (time >= frames[frames.length - 1]) { // Time is after last frame.
            let lastVertices = vertices[frames.length - 1];
            if (alpha == 1) {
                if (blend == MixBlend.add) {
                    let vertexAttachment = slotAttachment;
                    if (!vertexAttachment.bones) {
                        // Unweighted vertex positions, with alpha.
                        let setupVertices = vertexAttachment.vertices;
                        for (let i = 0; i < vertexCount; i++)
                            deform[i] += lastVertices[i] - setupVertices[i];
                    }
                    else {
                        // Weighted deform offsets, with alpha.
                        for (let i = 0; i < vertexCount; i++)
                            deform[i] += lastVertices[i];
                    }
                }
                else
                    Utils.arrayCopy(lastVertices, 0, deform, 0, vertexCount);
            }
            else {
                switch (blend) {
                    case MixBlend.setup: {
                        let vertexAttachment = slotAttachment;
                        if (!vertexAttachment.bones) {
                            // Unweighted vertex positions, with alpha.
                            let setupVertices = vertexAttachment.vertices;
                            for (let i = 0; i < vertexCount; i++) {
                                let setup = setupVertices[i];
                                deform[i] = setup + (lastVertices[i] - setup) * alpha;
                            }
                        }
                        else {
                            // Weighted deform offsets, with alpha.
                            for (let i = 0; i < vertexCount; i++)
                                deform[i] = lastVertices[i] * alpha;
                        }
                        break;
                    }
                    case MixBlend.first:
                    case MixBlend.replace:
                        for (let i = 0; i < vertexCount; i++)
                            deform[i] += (lastVertices[i] - deform[i]) * alpha;
                        break;
                    case MixBlend.add:
                        let vertexAttachment = slotAttachment;
                        if (!vertexAttachment.bones) {
                            // Unweighted vertex positions, with alpha.
                            let setupVertices = vertexAttachment.vertices;
                            for (let i = 0; i < vertexCount; i++)
                                deform[i] += (lastVertices[i] - setupVertices[i]) * alpha;
                        }
                        else {
                            // Weighted deform offsets, with alpha.
                            for (let i = 0; i < vertexCount; i++)
                                deform[i] += lastVertices[i] * alpha;
                        }
                }
            }
            return;
        }
        // Interpolate between the previous frame and the current frame.
        let frame = Timeline.search1(frames, time);
        let percent = this.getCurvePercent(time, frame);
        let prevVertices = vertices[frame];
        let nextVertices = vertices[frame + 1];
        if (alpha == 1) {
            if (blend == MixBlend.add) {
                let vertexAttachment = slotAttachment;
                if (!vertexAttachment.bones) {
                    // Unweighted vertex positions, with alpha.
                    let setupVertices = vertexAttachment.vertices;
                    for (let i = 0; i < vertexCount; i++) {
                        let prev = prevVertices[i];
                        deform[i] += prev + (nextVertices[i] - prev) * percent - setupVertices[i];
                    }
                }
                else {
                    // Weighted deform offsets, with alpha.
                    for (let i = 0; i < vertexCount; i++) {
                        let prev = prevVertices[i];
                        deform[i] += prev + (nextVertices[i] - prev) * percent;
                    }
                }
            }
            else {
                for (let i = 0; i < vertexCount; i++) {
                    let prev = prevVertices[i];
                    deform[i] = prev + (nextVertices[i] - prev) * percent;
                }
            }
        }
        else {
            switch (blend) {
                case MixBlend.setup: {
                    let vertexAttachment = slotAttachment;
                    if (!vertexAttachment.bones) {
                        // Unweighted vertex positions, with alpha.
                        let setupVertices = vertexAttachment.vertices;
                        for (let i = 0; i < vertexCount; i++) {
                            let prev = prevVertices[i], setup = setupVertices[i];
                            deform[i] = setup + (prev + (nextVertices[i] - prev) * percent - setup) * alpha;
                        }
                    }
                    else {
                        // Weighted deform offsets, with alpha.
                        for (let i = 0; i < vertexCount; i++) {
                            let prev = prevVertices[i];
                            deform[i] = (prev + (nextVertices[i] - prev) * percent) * alpha;
                        }
                    }
                    break;
                }
                case MixBlend.first:
                case MixBlend.replace:
                    for (let i = 0; i < vertexCount; i++) {
                        let prev = prevVertices[i];
                        deform[i] += (prev + (nextVertices[i] - prev) * percent - deform[i]) * alpha;
                    }
                    break;
                case MixBlend.add:
                    let vertexAttachment = slotAttachment;
                    if (!vertexAttachment.bones) {
                        // Unweighted vertex positions, with alpha.
                        let setupVertices = vertexAttachment.vertices;
                        for (let i = 0; i < vertexCount; i++) {
                            let prev = prevVertices[i];
                            deform[i] += (prev + (nextVertices[i] - prev) * percent - setupVertices[i]) * alpha;
                        }
                    }
                    else {
                        // Weighted deform offsets, with alpha.
                        for (let i = 0; i < vertexCount; i++) {
                            let prev = prevVertices[i];
                            deform[i] += (prev + (nextVertices[i] - prev) * percent) * alpha;
                        }
                    }
            }
        }
    }
}
/** Fires an {@link Event} when specific animation times are reached. */
export class EventTimeline extends Timeline {
    constructor(frameCount) {
        super(frameCount, EventTimeline.propertyIds);
        this.events = new Array(frameCount);
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the event for the specified key frame. */
    setFrame(frame, event) {
        this.frames[frame] = event.time;
        this.events[frame] = event;
    }
    /** Fires events for frames > `lastTime` and <= `time`. */
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        if (!firedEvents)
            return;
        let frames = this.frames;
        let frameCount = this.frames.length;
        if (lastTime > time) { // Fire events after last time for looped animations.
            this.apply(skeleton, lastTime, Number.MAX_VALUE, firedEvents, alpha, blend, direction);
            lastTime = -1;
        }
        else if (lastTime >= frames[frameCount - 1]) // Last time is after last frame.
            return;
        if (time < frames[0])
            return; // Time is before first frame.
        let i = 0;
        if (lastTime < frames[0])
            i = 0;
        else {
            i = Timeline.search1(frames, lastTime) + 1;
            let frameTime = frames[i];
            while (i > 0) { // Fire multiple events with the same frame.
                if (frames[i - 1] != frameTime)
                    break;
                i--;
            }
        }
        for (; i < frameCount && time >= frames[i]; i++)
            firedEvents.push(this.events[i]);
    }
}
EventTimeline.propertyIds = ["" + Property.event];
/** Changes a skeleton's {@link Skeleton#drawOrder}. */
export class DrawOrderTimeline extends Timeline {
    constructor(frameCount) {
        super(frameCount, DrawOrderTimeline.propertyIds);
        this.drawOrders = new Array(frameCount);
    }
    getFrameCount() {
        return this.frames.length;
    }
    /** Sets the time in seconds and the draw order for the specified key frame.
     * @param drawOrder For each slot in {@link Skeleton#slots}, the index of the new draw order. May be null to use setup pose
     *           draw order. */
    setFrame(frame, time, drawOrder) {
        this.frames[frame] = time;
        this.drawOrders[frame] = drawOrder;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        if (direction == MixDirection.mixOut) {
            if (blend == MixBlend.setup)
                Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
            return;
        }
        if (time < this.frames[0]) {
            if (blend == MixBlend.setup || blend == MixBlend.first)
                Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
            return;
        }
        let idx = Timeline.search1(this.frames, time);
        let drawOrderToSetupIndex = this.drawOrders[idx];
        if (!drawOrderToSetupIndex)
            Utils.arrayCopy(skeleton.slots, 0, skeleton.drawOrder, 0, skeleton.slots.length);
        else {
            let drawOrder = skeleton.drawOrder;
            let slots = skeleton.slots;
            for (let i = 0, n = drawOrderToSetupIndex.length; i < n; i++)
                drawOrder[i] = slots[drawOrderToSetupIndex[i]];
        }
    }
}
DrawOrderTimeline.propertyIds = ["" + Property.drawOrder];
/** Changes an IK constraint's {@link IkConstraint#mix}, {@link IkConstraint#softness},
 * {@link IkConstraint#bendDirection}, {@link IkConstraint#stretch}, and {@link IkConstraint#compress}. */
export class IkConstraintTimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, ikConstraintIndex) {
        super(frameCount, bezierCount, [
            Property.ikConstraint + "|" + ikConstraintIndex
        ]);
        /** The index of the IK constraint slot in {@link Skeleton#ikConstraints} that will be changed. */
        this.ikConstraintIndex = 0;
        this.ikConstraintIndex = ikConstraintIndex;
    }
    getFrameEntries() {
        return 6 /*ENTRIES*/;
    }
    /** Sets the time in seconds, mix, softness, bend direction, compress, and stretch for the specified key frame. */
    setFrame(frame, time, mix, softness, bendDirection, compress, stretch) {
        frame *= 6 /*ENTRIES*/;
        this.frames[frame] = time;
        this.frames[frame + 1 /*MIX*/] = mix;
        this.frames[frame + 2 /*SOFTNESS*/] = softness;
        this.frames[frame + 3 /*BEND_DIRECTION*/] = bendDirection;
        this.frames[frame + 4 /*COMPRESS*/] = compress ? 1 : 0;
        this.frames[frame + 5 /*STRETCH*/] = stretch ? 1 : 0;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let constraint = skeleton.ikConstraints[this.ikConstraintIndex];
        if (!constraint.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    constraint.mix = constraint.data.mix;
                    constraint.softness = constraint.data.softness;
                    constraint.bendDirection = constraint.data.bendDirection;
                    constraint.compress = constraint.data.compress;
                    constraint.stretch = constraint.data.stretch;
                    return;
                case MixBlend.first:
                    constraint.mix += (constraint.data.mix - constraint.mix) * alpha;
                    constraint.softness += (constraint.data.softness - constraint.softness) * alpha;
                    constraint.bendDirection = constraint.data.bendDirection;
                    constraint.compress = constraint.data.compress;
                    constraint.stretch = constraint.data.stretch;
            }
            return;
        }
        let mix = 0, softness = 0;
        let i = Timeline.search(frames, time, 6 /*ENTRIES*/);
        let curveType = this.curves[i / 6 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                mix = frames[i + 1 /*MIX*/];
                softness = frames[i + 2 /*SOFTNESS*/];
                let t = (time - before) / (frames[i + 6 /*ENTRIES*/] - before);
                mix += (frames[i + 6 /*ENTRIES*/ + 1 /*MIX*/] - mix) * t;
                softness += (frames[i + 6 /*ENTRIES*/ + 2 /*SOFTNESS*/] - softness) * t;
                break;
            case 1 /*STEPPED*/:
                mix = frames[i + 1 /*MIX*/];
                softness = frames[i + 2 /*SOFTNESS*/];
                break;
            default:
                mix = this.getBezierValue(time, i, 1 /*MIX*/, curveType - 2 /*BEZIER*/);
                softness = this.getBezierValue(time, i, 2 /*SOFTNESS*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
        }
        if (blend == MixBlend.setup) {
            constraint.mix = constraint.data.mix + (mix - constraint.data.mix) * alpha;
            constraint.softness = constraint.data.softness + (softness - constraint.data.softness) * alpha;
            if (direction == MixDirection.mixOut) {
                constraint.bendDirection = constraint.data.bendDirection;
                constraint.compress = constraint.data.compress;
                constraint.stretch = constraint.data.stretch;
            }
            else {
                constraint.bendDirection = frames[i + 3 /*BEND_DIRECTION*/];
                constraint.compress = frames[i + 4 /*COMPRESS*/] != 0;
                constraint.stretch = frames[i + 5 /*STRETCH*/] != 0;
            }
        }
        else {
            constraint.mix += (mix - constraint.mix) * alpha;
            constraint.softness += (softness - constraint.softness) * alpha;
            if (direction == MixDirection.mixIn) {
                constraint.bendDirection = frames[i + 3 /*BEND_DIRECTION*/];
                constraint.compress = frames[i + 4 /*COMPRESS*/] != 0;
                constraint.stretch = frames[i + 5 /*STRETCH*/] != 0;
            }
        }
    }
}
/** Changes a transform constraint's {@link TransformConstraint#rotateMix}, {@link TransformConstraint#translateMix},
 * {@link TransformConstraint#scaleMix}, and {@link TransformConstraint#shearMix}. */
export class TransformConstraintTimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, transformConstraintIndex) {
        super(frameCount, bezierCount, [
            Property.transformConstraint + "|" + transformConstraintIndex
        ]);
        /** The index of the transform constraint slot in {@link Skeleton#transformConstraints} that will be changed. */
        this.transformConstraintIndex = 0;
        this.transformConstraintIndex = transformConstraintIndex;
    }
    getFrameEntries() {
        return 7 /*ENTRIES*/;
    }
    /** The time in seconds, rotate mix, translate mix, scale mix, and shear mix for the specified key frame. */
    setFrame(frame, time, mixRotate, mixX, mixY, mixScaleX, mixScaleY, mixShearY) {
        let frames = this.frames;
        frame *= 7 /*ENTRIES*/;
        frames[frame] = time;
        frames[frame + 1 /*ROTATE*/] = mixRotate;
        frames[frame + 2 /*X*/] = mixX;
        frames[frame + 3 /*Y*/] = mixY;
        frames[frame + 4 /*SCALEX*/] = mixScaleX;
        frames[frame + 5 /*SCALEY*/] = mixScaleY;
        frames[frame + 6 /*SHEARY*/] = mixShearY;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let constraint = skeleton.transformConstraints[this.transformConstraintIndex];
        if (!constraint.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            let data = constraint.data;
            switch (blend) {
                case MixBlend.setup:
                    constraint.mixRotate = data.mixRotate;
                    constraint.mixX = data.mixX;
                    constraint.mixY = data.mixY;
                    constraint.mixScaleX = data.mixScaleX;
                    constraint.mixScaleY = data.mixScaleY;
                    constraint.mixShearY = data.mixShearY;
                    return;
                case MixBlend.first:
                    constraint.mixRotate += (data.mixRotate - constraint.mixRotate) * alpha;
                    constraint.mixX += (data.mixX - constraint.mixX) * alpha;
                    constraint.mixY += (data.mixY - constraint.mixY) * alpha;
                    constraint.mixScaleX += (data.mixScaleX - constraint.mixScaleX) * alpha;
                    constraint.mixScaleY += (data.mixScaleY - constraint.mixScaleY) * alpha;
                    constraint.mixShearY += (data.mixShearY - constraint.mixShearY) * alpha;
            }
            return;
        }
        let rotate, x, y, scaleX, scaleY, shearY;
        let i = Timeline.search(frames, time, 7 /*ENTRIES*/);
        let curveType = this.curves[i / 7 /*ENTRIES*/];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                scaleX = frames[i + 4 /*SCALEX*/];
                scaleY = frames[i + 5 /*SCALEY*/];
                shearY = frames[i + 6 /*SHEARY*/];
                let t = (time - before) / (frames[i + 7 /*ENTRIES*/] - before);
                rotate += (frames[i + 7 /*ENTRIES*/ + 1 /*ROTATE*/] - rotate) * t;
                x += (frames[i + 7 /*ENTRIES*/ + 2 /*X*/] - x) * t;
                y += (frames[i + 7 /*ENTRIES*/ + 3 /*Y*/] - y) * t;
                scaleX += (frames[i + 7 /*ENTRIES*/ + 4 /*SCALEX*/] - scaleX) * t;
                scaleY += (frames[i + 7 /*ENTRIES*/ + 5 /*SCALEY*/] - scaleY) * t;
                shearY += (frames[i + 7 /*ENTRIES*/ + 6 /*SHEARY*/] - shearY) * t;
                break;
            case 1 /*STEPPED*/:
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                scaleX = frames[i + 4 /*SCALEX*/];
                scaleY = frames[i + 5 /*SCALEY*/];
                shearY = frames[i + 6 /*SHEARY*/];
                break;
            default:
                rotate = this.getBezierValue(time, i, 1 /*ROTATE*/, curveType - 2 /*BEZIER*/);
                x = this.getBezierValue(time, i, 2 /*X*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 3 /*Y*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
                scaleX = this.getBezierValue(time, i, 4 /*SCALEX*/, curveType + 18 /*BEZIER_SIZE*/ * 3 - 2 /*BEZIER*/);
                scaleY = this.getBezierValue(time, i, 5 /*SCALEY*/, curveType + 18 /*BEZIER_SIZE*/ * 4 - 2 /*BEZIER*/);
                shearY = this.getBezierValue(time, i, 6 /*SHEARY*/, curveType + 18 /*BEZIER_SIZE*/ * 5 - 2 /*BEZIER*/);
        }
        if (blend == MixBlend.setup) {
            let data = constraint.data;
            constraint.mixRotate = data.mixRotate + (rotate - data.mixRotate) * alpha;
            constraint.mixX = data.mixX + (x - data.mixX) * alpha;
            constraint.mixY = data.mixY + (y - data.mixY) * alpha;
            constraint.mixScaleX = data.mixScaleX + (scaleX - data.mixScaleX) * alpha;
            constraint.mixScaleY = data.mixScaleY + (scaleY - data.mixScaleY) * alpha;
            constraint.mixShearY = data.mixShearY + (shearY - data.mixShearY) * alpha;
        }
        else {
            constraint.mixRotate += (rotate - constraint.mixRotate) * alpha;
            constraint.mixX += (x - constraint.mixX) * alpha;
            constraint.mixY += (y - constraint.mixY) * alpha;
            constraint.mixScaleX += (scaleX - constraint.mixScaleX) * alpha;
            constraint.mixScaleY += (scaleY - constraint.mixScaleY) * alpha;
            constraint.mixShearY += (shearY - constraint.mixShearY) * alpha;
        }
    }
}
/** Changes a path constraint's {@link PathConstraint#position}. */
export class PathConstraintPositionTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, pathConstraintIndex) {
        super(frameCount, bezierCount, Property.pathConstraintPosition + "|" + pathConstraintIndex);
        /** The index of the path constraint slot in {@link Skeleton#pathConstraints} that will be changed. */
        this.pathConstraintIndex = 0;
        this.pathConstraintIndex = pathConstraintIndex;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (!constraint.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    constraint.position = constraint.data.position;
                    return;
                case MixBlend.first:
                    constraint.position += (constraint.data.position - constraint.position) * alpha;
            }
            return;
        }
        let position = this.getCurveValue(time);
        if (blend == MixBlend.setup)
            constraint.position = constraint.data.position + (position - constraint.data.position) * alpha;
        else
            constraint.position += (position - constraint.position) * alpha;
    }
}
/** Changes a path constraint's {@link PathConstraint#spacing}. */
export class PathConstraintSpacingTimeline extends CurveTimeline1 {
    constructor(frameCount, bezierCount, pathConstraintIndex) {
        super(frameCount, bezierCount, Property.pathConstraintSpacing + "|" + pathConstraintIndex);
        /** The index of the path constraint slot in {@link Skeleton#getPathConstraints()} that will be changed. */
        this.pathConstraintIndex = 0;
        this.pathConstraintIndex = pathConstraintIndex;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (!constraint.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    constraint.spacing = constraint.data.spacing;
                    return;
                case MixBlend.first:
                    constraint.spacing += (constraint.data.spacing - constraint.spacing) * alpha;
            }
            return;
        }
        let spacing = this.getCurveValue(time);
        if (blend == MixBlend.setup)
            constraint.spacing = constraint.data.spacing + (spacing - constraint.data.spacing) * alpha;
        else
            constraint.spacing += (spacing - constraint.spacing) * alpha;
    }
}
/** Changes a transform constraint's {@link PathConstraint#getMixRotate()}, {@link PathConstraint#getMixX()}, and
 * {@link PathConstraint#getMixY()}. */
export class PathConstraintMixTimeline extends CurveTimeline {
    constructor(frameCount, bezierCount, pathConstraintIndex) {
        super(frameCount, bezierCount, [
            Property.pathConstraintMix + "|" + pathConstraintIndex
        ]);
        /** The index of the path constraint slot in {@link Skeleton#getPathConstraints()} that will be changed. */
        this.pathConstraintIndex = 0;
        this.pathConstraintIndex = pathConstraintIndex;
    }
    getFrameEntries() {
        return 4 /*ENTRIES*/;
    }
    setFrame(frame, time, mixRotate, mixX, mixY) {
        let frames = this.frames;
        frame <<= 2;
        frames[frame] = time;
        frames[frame + 1 /*ROTATE*/] = mixRotate;
        frames[frame + 2 /*X*/] = mixX;
        frames[frame + 3 /*Y*/] = mixY;
    }
    apply(skeleton, lastTime, time, firedEvents, alpha, blend, direction) {
        let constraint = skeleton.pathConstraints[this.pathConstraintIndex];
        if (!constraint.active)
            return;
        let frames = this.frames;
        if (time < frames[0]) {
            switch (blend) {
                case MixBlend.setup:
                    constraint.mixRotate = constraint.data.mixRotate;
                    constraint.mixX = constraint.data.mixX;
                    constraint.mixY = constraint.data.mixY;
                    return;
                case MixBlend.first:
                    constraint.mixRotate += (constraint.data.mixRotate - constraint.mixRotate) * alpha;
                    constraint.mixX += (constraint.data.mixX - constraint.mixX) * alpha;
                    constraint.mixY += (constraint.data.mixY - constraint.mixY) * alpha;
            }
            return;
        }
        let rotate, x, y;
        let i = Timeline.search(frames, time, 4 /*ENTRIES*/);
        let curveType = this.curves[i >> 2];
        switch (curveType) {
            case 0 /*LINEAR*/:
                let before = frames[i];
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                let t = (time - before) / (frames[i + 4 /*ENTRIES*/] - before);
                rotate += (frames[i + 4 /*ENTRIES*/ + 1 /*ROTATE*/] - rotate) * t;
                x += (frames[i + 4 /*ENTRIES*/ + 2 /*X*/] - x) * t;
                y += (frames[i + 4 /*ENTRIES*/ + 3 /*Y*/] - y) * t;
                break;
            case 1 /*STEPPED*/:
                rotate = frames[i + 1 /*ROTATE*/];
                x = frames[i + 2 /*X*/];
                y = frames[i + 3 /*Y*/];
                break;
            default:
                rotate = this.getBezierValue(time, i, 1 /*ROTATE*/, curveType - 2 /*BEZIER*/);
                x = this.getBezierValue(time, i, 2 /*X*/, curveType + 18 /*BEZIER_SIZE*/ - 2 /*BEZIER*/);
                y = this.getBezierValue(time, i, 3 /*Y*/, curveType + 18 /*BEZIER_SIZE*/ * 2 - 2 /*BEZIER*/);
        }
        if (blend == MixBlend.setup) {
            let data = constraint.data;
            constraint.mixRotate = data.mixRotate + (rotate - data.mixRotate) * alpha;
            constraint.mixX = data.mixX + (x - data.mixX) * alpha;
            constraint.mixY = data.mixY + (y - data.mixY) * alpha;
        }
        else {
            constraint.mixRotate += (rotate - constraint.mixRotate) * alpha;
            constraint.mixX += (x - constraint.mixX) * alpha;
            constraint.mixY += (y - constraint.mixY) * alpha;
        }
    }
}
/** Changes a slot's {@link Slot#getSequenceIndex()} for an attachment's {@link Sequence}. */
export class SequenceTimeline extends Timeline {
    constructor(frameCount, slotIndex, attachment) {
        super(frameCount, [
            Property.sequence + "|" + slotIndex + "|" + attachment.sequence.id
        ]);
        this.slotIndex = slotIndex;
        this.attachment = attachment;
    }
    getFrameEntries() {
        return SequenceTimeline.ENTRIES;
    }
    getSlotIndex() {
        return this.slotIndex;
    }
    getAttachment() {
        return this.attachment;
    }
    /** Sets the time, mode, index, and frame time for the specified frame.
     * @param frame Between 0 and <code>frameCount</code>, inclusive.
     * @param time Seconds between frames. */
    setFrame(frame, time, mode, index, delay) {
        let frames = this.frames;
        frame *= SequenceTimeline.ENTRIES;
        frames[frame] = time;
        frames[frame + SequenceTimeline.MODE] = mode | (index << 4);
        frames[frame + SequenceTimeline.DELAY] = delay;
    }
    apply(skeleton, lastTime, time, events, alpha, blend, direction) {
        let slot = skeleton.slots[this.slotIndex];
        if (!slot.bone.active)
            return;
        let slotAttachment = slot.attachment;
        let attachment = this.attachment;
        if (slotAttachment != attachment) {
            if (!(slotAttachment instanceof VertexAttachment)
                || slotAttachment.timelineAttachment != attachment)
                return;
        }
        let frames = this.frames;
        if (time < frames[0]) { // Time is before first frame.
            if (blend == MixBlend.setup || blend == MixBlend.first)
                slot.sequenceIndex = -1;
            return;
        }
        let i = Timeline.search(frames, time, SequenceTimeline.ENTRIES);
        let before = frames[i];
        let modeAndIndex = frames[i + SequenceTimeline.MODE];
        let delay = frames[i + SequenceTimeline.DELAY];
        if (!this.attachment.sequence)
            return;
        let index = modeAndIndex >> 4, count = this.attachment.sequence.regions.length;
        let mode = SequenceModeValues[modeAndIndex & 0xf];
        if (mode != SequenceMode.hold) {
            index += (((time - before) / delay + 0.00001) | 0);
            switch (mode) {
                case SequenceMode.once:
                    index = Math.min(count - 1, index);
                    break;
                case SequenceMode.loop:
                    index %= count;
                    break;
                case SequenceMode.pingpong: {
                    let n = (count << 1) - 2;
                    index = n == 0 ? 0 : index % n;
                    if (index >= count)
                        index = n - index;
                    break;
                }
                case SequenceMode.onceReverse:
                    index = Math.max(count - 1 - index, 0);
                    break;
                case SequenceMode.loopReverse:
                    index = count - 1 - (index % count);
                    break;
                case SequenceMode.pingpongReverse: {
                    let n = (count << 1) - 2;
                    index = n == 0 ? 0 : (index + count - 1) % n;
                    if (index >= count)
                        index = n - index;
                }
            }
        }
        slot.sequenceIndex = index;
    }
}
SequenceTimeline.ENTRIES = 3;
SequenceTimeline.MODE = 1;
SequenceTimeline.DELAY = 2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQW5pbWF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL0FuaW1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFjLE1BQU0sMEJBQTBCLENBQUM7QUFNeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFtQixNQUFNLFNBQVMsQ0FBQztBQUd2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFMUUsNkRBQTZEO0FBQzdELE1BQU0sT0FBTyxTQUFTO0lBU3JCLFlBQWEsSUFBWSxFQUFFLFNBQTBCLEVBQUUsUUFBZ0I7UUFOdkUsY0FBUyxHQUFvQixFQUFFLENBQUM7UUFDaEMsZ0JBQVcsR0FBYyxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBTXhDLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVELFlBQVksQ0FBRSxTQUEwQjtRQUN2QyxJQUFJLENBQUMsU0FBUztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRTtZQUN4QyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0s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QUUsS0FBYSxFQUFFLEtBQWEsRUFBRSxLQUFhLEVBQUUsTUFBYyxFQUFFLEdBQVcsRUFBRSxHQUFXLEVBQUUsR0FBVyxFQUM1SCxHQUFXLEVBQUUsS0FBYSxFQUFFLE1BQWM7UUFDMUMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN6QixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxHQUFHLEVBQUUsQ0FBQSxlQUFlLENBQUM7UUFDMUQsSUFBSSxLQUFLLElBQUksQ0FBQztZQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUEsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNoRCxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDbEYsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUN6RyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDakQsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsVUFBVSxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxVQUFV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LEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQzt3QkFDckUsTUFBTTtvQkFDUCxLQUFLLFFBQVEsQ0FBQyxHQUFHO3dCQUNoQixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDO2lCQUMvQzthQUNEO2lCQUFNO2dCQUNOLFFBQVEsS0FBSyxFQUFFO29CQUNkLEtBQUssUUFBUSxDQUFDLEtBQUs7d0JBQ2xCLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDO3dCQUNwQyxNQUFNO29CQUNQLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQztvQkFDcEIsS0FBSyxRQUFRLENBQUMsT0FBTzt3QkFDcEIsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2pELElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQzt3QkFDcEMsTUFBTTtvQkFDUCxLQUFLLFFBQVEsQ0FBQyxHQUFHO3dCQUNoQixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDO2lCQUMvQzthQUNEO1NBQ0Q7SUFDRixDQUFDO0NBQ0Q7QUFFRCwyRUFB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RyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFdBQVcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO2dCQUM5RCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxXQUFXLEdBQUcsQ0FBQyxDQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakQsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsV0FBVyxHQUFHLENBQUMsQ0FBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pELENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFdBQVcsR0FBRyxDQUFDLENBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxXQUFXLEdBQUcsQ0FBQyxDQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakQsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsV0FBVyxHQUFHLENBQUMsQ0FBQSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BELEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFdBQVcsR0FBRyxDQUFDLENBQUEsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwRCxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxXQUFXLEdBQUcsQ0FBQyxDQUFBLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEQsTUFBTTtZQUNQLEtB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QyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFdBQVcsR0FBRyxDQUFDLENBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqRCxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxXQUFXLEdBQUcsQ0FBQyxDQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsV0FBVyxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hFLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFdBQVcsR0FBRyxDQUFDLENBQUEsVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxXQUFXLEdBQUcsQ0FBQyxDQUFBLFVBQVUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEUsTUFBTTtZQUNQLEtBQUssQ0FBQyxDQUFBLFdBQVc7Z0JBQ2hCLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztnQkFDakMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLEtBQUssQ0FBQyxDQUFDO2dCQUN2QixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsS0FBSyxDQUFDLENBQUM7Z0JBQ3ZCLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztnQkFDakMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFVBQVUsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUEsVUFBVSxDQUFDLENBQUM7Z0JBQ2pDLE1BQU07WUFDUDtnQkFDQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQSxVQUFVLEVBQUUsU0FBUyxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztnQkFDNUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUEsS0FBSyxFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUEsZUFBZSxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztnQkFDdEYsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUEsS0FBSyxFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUEsZUFBZSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUEsVUFBVSxDQUFDLENBQUM7Z0JBQzFGLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBLFVBQVUsRUFBRSxTQUFTLEdBQUcsRUFBRSxDQUFBLGVBQWUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBLFVBQVUsQ0FBQyxDQUFDO2dCQUNwRyxNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQSxVQUFVLEVBQUUsU0FBUyxHQUFHLEVBQUUsQ0FBQSxlQUFlLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztnQkFDcEcsTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUEsVUFBVSxFQUFFLFNBQVMsR0FBRyxFQUFFLENBQUEsZUFBZSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUEsVUFBVSxDQUFDLENBQUM7U0FDckc7UUFFRCxJQUFJLEtBQUssSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQzVCLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDM0IsVUFBVSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDMUUsVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDdEQsVUFBVSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDMUUsVUFBVSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDMUUsVUFBVSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7U0FDMUU7YUFBTTtZQUNOLFVBQVUsQ0FBQyxTQUFTLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUNoRSxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDakQsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ2pELFVBQVUsQ0FBQyxTQUFTLElBQUksQ0FBQyxN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