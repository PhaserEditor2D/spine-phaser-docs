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
import { TransformMode } from "./BoneData";
import { MathUtils } from "./Utils";
/** Stores a bone's current pose.
 *
 * A bone has a local transform which is used to compute its world transform. A bone also has an applied transform, which is a
 * local transform that can be applied to compute the world transform. The local transform and applied transform may differ if a
 * constraint or application code modifies the world transform after it was computed from the local transform. */
export class Bone {
    /** @param parent May be null. */
    constructor(data, skeleton, parent) {
        /** The parent bone, or null if this is the root bone. */
        this.parent = null;
        /** The immediate children of this bone. */
        this.children = new Array();
        /** The local x translation. */
        this.x = 0;
        /** The local y translation. */
        this.y = 0;
        /** The local rotation in degrees, counter clockwise. */
        this.rotation = 0;
        /** The local scaleX. */
        this.scaleX = 0;
        /** The local scaleY. */
        this.scaleY = 0;
        /** The local shearX. */
        this.shearX = 0;
        /** The local shearY. */
        this.shearY = 0;
        /** The applied local x translation. */
        this.ax = 0;
        /** The applied local y translation. */
        this.ay = 0;
        /** The applied local rotation in degrees, counter clockwise. */
        this.arotation = 0;
        /** The applied local scaleX. */
        this.ascaleX = 0;
        /** The applied local scaleY. */
        this.ascaleY = 0;
        /** The applied local shearX. */
        this.ashearX = 0;
        /** The applied local shearY. */
        this.ashearY = 0;
        /** Part of the world transform matrix for the X axis. If changed, {@link #updateAppliedTransform()} should be called. */
        this.a = 0;
        /** Part of the world transform matrix for the Y axis. If changed, {@link #updateAppliedTransform()} should be called. */
        this.b = 0;
        /** Part of the world transform matrix for the X axis. If changed, {@link #updateAppliedTransform()} should be called. */
        this.c = 0;
        /** Part of the world transform matrix for the Y axis. If changed, {@link #updateAppliedTransform()} should be called. */
        this.d = 0;
        /** The world X position. If changed, {@link #updateAppliedTransform()} should be called. */
        this.worldY = 0;
        /** The world Y position. If changed, {@link #updateAppliedTransform()} should be called. */
        this.worldX = 0;
        this.sorted = false;
        this.active = false;
        if (!data)
            throw new Error("data cannot be null.");
        if (!skeleton)
            throw new Error("skeleton cannot be null.");
        this.data = data;
        this.skeleton = skeleton;
        this.parent = parent;
        this.setToSetupPose();
    }
    /** Returns false when the bone has not been computed because {@link BoneData#skinRequired} is true and the
      * {@link Skeleton#skin active skin} does not {@link Skin#bones contain} this bone. */
    isActive() {
        return this.active;
    }
    /** Computes the world transform using the parent bone and this bone's local applied transform. */
    update() {
        this.updateWorldTransformWith(this.ax, this.ay, this.arotation, this.ascaleX, this.ascaleY, this.ashearX, this.ashearY);
    }
    /** Computes the world transform using the parent bone and this bone's local transform.
     *
     * See {@link #updateWorldTransformWith()}. */
    updateWorldTransform() {
        this.updateWorldTransformWith(this.x, this.y, this.rotation, this.scaleX, this.scaleY, this.shearX, this.shearY);
    }
    /** Computes the world transform using the parent bone and the specified local transform. The applied transform is set to the
     * specified local transform. Child bones are not updated.
     *
     * See [World transforms](http://esotericsoftware.com/spine-runtime-skeletons#World-transforms) in the Spine
     * Runtimes Guide. */
    updateWorldTransformWith(x, y, rotation, scaleX, scaleY, shearX, shearY) {
        this.ax = x;
        this.ay = y;
        this.arotation = rotation;
        this.ascaleX = scaleX;
        this.ascaleY = scaleY;
        this.ashearX = shearX;
        this.ashearY = shearY;
        let parent = this.parent;
        if (!parent) { // Root bone.
            let skeleton = this.skeleton;
            let rotationY = rotation + 90 + shearY;
            let sx = skeleton.scaleX;
            let sy = skeleton.scaleY;
            this.a = MathUtils.cosDeg(rotation + shearX) * scaleX * sx;
            this.b = MathUtils.cosDeg(rotationY) * scaleY * sx;
            this.c = MathUtils.sinDeg(rotation + shearX) * scaleX * sy;
            this.d = MathUtils.sinDeg(rotationY) * scaleY * sy;
            this.worldX = x * sx + skeleton.x;
            this.worldY = y * sy + skeleton.y;
            return;
        }
        let pa = parent.a, pb = parent.b, pc = parent.c, pd = parent.d;
        this.worldX = pa * x + pb * y + parent.worldX;
        this.worldY = pc * x + pd * y + parent.worldY;
        switch (this.data.transformMode) {
            case TransformMode.Normal: {
                let rotationY = rotation + 90 + shearY;
                let la = MathUtils.cosDeg(rotation + shearX) * scaleX;
                let lb = MathUtils.cosDeg(rotationY) * scaleY;
                let lc = MathUtils.sinDeg(rotation + shearX) * scaleX;
                let ld = MathUtils.sinDeg(rotationY) * scaleY;
                this.a = pa * la + pb * lc;
                this.b = pa * lb + pb * ld;
                this.c = pc * la + pd * lc;
                this.d = pc * lb + pd * ld;
                return;
            }
            case TransformMode.OnlyTranslation: {
                let rotationY = rotation + 90 + shearY;
                this.a = MathUtils.cosDeg(rotation + shearX) * scaleX;
                this.b = MathUtils.cosDeg(rotationY) * scaleY;
                this.c = MathUtils.sinDeg(rotation + shearX) * scaleX;
                this.d = MathUtils.sinDeg(rotationY) * scaleY;
                break;
            }
            case TransformMode.NoRotationOrReflection: {
                let s = pa * pa + pc * pc;
                let prx = 0;
                if (s > 0.0001) {
                    s = Math.abs(pa * pd - pb * pc) / s;
                    pa /= this.skeleton.scaleX;
                    pc /= this.skeleton.scaleY;
                    pb = pc * s;
                    pd = pa * s;
                    prx = Math.atan2(pc, pa) * MathUtils.radDeg;
                }
                else {
                    pa = 0;
                    pc = 0;
                    prx = 90 - Math.atan2(pd, pb) * MathUtils.radDeg;
                }
                let rx = rotation + shearX - prx;
                let ry = rotation + shearY - prx + 90;
                let la = MathUtils.cosDeg(rx) * scaleX;
                let lb = MathUtils.cosDeg(ry) * scaleY;
                let lc = MathUtils.sinDeg(rx) * scaleX;
                let ld = MathUtils.sinDeg(ry) * scaleY;
                this.a = pa * la - pb * lc;
                this.b = pa * lb - pb * ld;
                this.c = pc * la + pd * lc;
                this.d = pc * lb + pd * ld;
                break;
            }
            case TransformMode.NoScale:
            case TransformMode.NoScaleOrReflection: {
                let cos = MathUtils.cosDeg(rotation);
                let sin = MathUtils.sinDeg(rotation);
                let za = (pa * cos + pb * sin) / this.skeleton.scaleX;
                let zc = (pc * cos + pd * sin) / this.skeleton.scaleY;
                let s = Math.sqrt(za * za + zc * zc);
                if (s > 0.00001)
                    s = 1 / s;
                za *= s;
                zc *= s;
                s = Math.sqrt(za * za + zc * zc);
                if (this.data.transformMode == TransformMode.NoScale
                    && (pa * pd - pb * pc < 0) != (this.skeleton.scaleX < 0 != this.skeleton.scaleY < 0))
                    s = -s;
                let r = Math.PI / 2 + Math.atan2(zc, za);
                let zb = Math.cos(r) * s;
                let zd = Math.sin(r) * s;
                let la = MathUtils.cosDeg(shearX) * scaleX;
                let lb = MathUtils.cosDeg(90 + shearY) * scaleY;
                let lc = MathUtils.sinDeg(shearX) * scaleX;
                let ld = MathUtils.sinDeg(90 + shearY) * scaleY;
                this.a = za * la + zb * lc;
                this.b = za * lb + zb * ld;
                this.c = zc * la + zd * lc;
                this.d = zc * lb + zd * ld;
                break;
            }
        }
        this.a *= this.skeleton.scaleX;
        this.b *= this.skeleton.scaleX;
        this.c *= this.skeleton.scaleY;
        this.d *= this.skeleton.scaleY;
    }
    /** Sets this bone's local transform to the setup pose. */
    setToSetupPose() {
        let data = this.data;
        this.x = data.x;
        this.y = data.y;
        this.rotation = data.rotation;
        this.scaleX = data.scaleX;
        this.scaleY = data.scaleY;
        this.shearX = data.shearX;
        this.shearY = data.shearY;
    }
    /** The world rotation for the X axis, calculated using {@link #a} and {@link #c}. */
    getWorldRotationX() {
        return Math.atan2(this.c, this.a) * MathUtils.radDeg;
    }
    /** The world rotation for the Y axis, calculated using {@link #b} and {@link #d}. */
    getWorldRotationY() {
        return Math.atan2(this.d, this.b) * MathUtils.radDeg;
    }
    /** The magnitude (always positive) of the world scale X, calculated using {@link #a} and {@link #c}. */
    getWorldScaleX() {
        return Math.sqrt(this.a * this.a + this.c * this.c);
    }
    /** The magnitude (always positive) of the world scale Y, calculated using {@link #b} and {@link #d}. */
    getWorldScaleY() {
        return Math.sqrt(this.b * this.b + this.d * this.d);
    }
    /** Computes the applied transform values from the world transform.
     *
     * If the world transform is modified (by a constraint, {@link #rotateWorld(float)}, etc) then this method should be called so
     * the applied transform matches the world transform. The applied transform may be needed by other code (eg to apply other
     * constraints).
     *
     * Some information is ambiguous in the world transform, such as -1,-1 scale versus 180 rotation. The applied transform after
     * calling this method is equivalent to the local transform used to compute the world transform, but may not be identical. */
    updateAppliedTransform() {
        let parent = this.parent;
        if (!parent) {
            this.ax = this.worldX - this.skeleton.x;
            this.ay = this.worldY - this.skeleton.y;
            this.arotation = Math.atan2(this.c, this.a) * MathUtils.radDeg;
            this.ascaleX = Math.sqrt(this.a * this.a + this.c * this.c);
            this.ascaleY = Math.sqrt(this.b * this.b + this.d * this.d);
            this.ashearX = 0;
            this.ashearY = Math.atan2(this.a * this.b + this.c * this.d, this.a * this.d - this.b * this.c) * MathUtils.radDeg;
            return;
        }
        let pa = parent.a, pb = parent.b, pc = parent.c, pd = parent.d;
        let pid = 1 / (pa * pd - pb * pc);
        let dx = this.worldX - parent.worldX, dy = this.worldY - parent.worldY;
        this.ax = (dx * pd * pid - dy * pb * pid);
        this.ay = (dy * pa * pid - dx * pc * pid);
        let ia = pid * pd;
        let id = pid * pa;
        let ib = pid * pb;
        let ic = pid * pc;
        let ra = ia * this.a - ib * this.c;
        let rb = ia * this.b - ib * this.d;
        let rc = id * this.c - ic * this.a;
        let rd = id * this.d - ic * this.b;
        this.ashearX = 0;
        this.ascaleX = Math.sqrt(ra * ra + rc * rc);
        if (this.ascaleX > 0.0001) {
            let det = ra * rd - rb * rc;
            this.ascaleY = det / this.ascaleX;
            this.ashearY = Math.atan2(ra * rb + rc * rd, det) * MathUtils.radDeg;
            this.arotation = Math.atan2(rc, ra) * MathUtils.radDeg;
        }
        else {
            this.ascaleX = 0;
            this.ascaleY = Math.sqrt(rb * rb + rd * rd);
            this.ashearY = 0;
            this.arotation = 90 - Math.atan2(rd, rb) * MathUtils.radDeg;
        }
    }
    /** Transforms a point from world coordinates to the bone's local coordinates. */
    worldToLocal(world) {
        let invDet = 1 / (this.a * this.d - this.b * this.c);
        let x = world.x - this.worldX, y = world.y - this.worldY;
        world.x = x * this.d * invDet - y * this.b * invDet;
        world.y = y * this.a * invDet - x * this.c * invDet;
        return world;
    }
    /** Transforms a point from the bone's local coordinates to world coordinates. */
    localToWorld(local) {
        let x = local.x, y = local.y;
        local.x = x * this.a + y * this.b + this.worldX;
        local.y = x * this.c + y * this.d + this.worldY;
        return local;
    }
    /** Transforms a world rotation to a local rotation. */
    worldToLocalRotation(worldRotation) {
        let sin = MathUtils.sinDeg(worldRotation), cos = MathUtils.cosDeg(worldRotation);
        return Math.atan2(this.a * sin - this.c * cos, this.d * cos - this.b * sin) * MathUtils.radDeg + this.rotation - this.shearX;
    }
    /** Transforms a local rotation to a world rotation. */
    localToWorldRotation(localRotation) {
        localRotation -= this.rotation - this.shearX;
        let sin = MathUtils.sinDeg(localRotation), cos = MathUtils.cosDeg(localRotation);
        return Math.atan2(cos * this.c + sin * this.d, cos * this.a + sin * this.b) * MathUtils.radDeg;
    }
    /** Rotates the world transform the specified amount.
     * <p>
     * After changes are made to the world transform, {@link #updateAppliedTransform()} should be called and {@link #update()} will
     * need to be called on any child bones, recursively. */
    rotateWorld(degrees) {
        let a = this.a, b = this.b, c = this.c, d = this.d;
        let cos = MathUtils.cosDeg(degrees), sin = MathUtils.sinDeg(degrees);
        this.a = cos * a - sin * c;
        this.b = cos * b - sin * d;
        this.c = sin * a + cos * c;
        this.d = sin * b + cos * d;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQm9uZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Cb25lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUUvRSxPQUFPLEVBQVksYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR3JELE9BQU8sRUFBRSxTQUFTLEVBQVcsTUFBTSxTQUFTLENBQUM7QUFFN0M7Ozs7aUhBSWlIO0FBQ2pILE1BQU0sT0FBTyxJQUFJO0lBNEVoQixpQ0FBaUM7SUFDakMsWUFBYSxJQUFjLEVBQUUsUUFBa0IsRUFBRSxNQUFtQjtRQXRFcEUseURBQXlEO1FBQ3pELFdBQU0sR0FBZ0IsSUFBSSxDQUFDO1FBRTNCLDJDQUEyQztRQUMzQyxhQUFRLEdBQUcsSUFBSSxLQUFLLEVBQVEsQ0FBQztRQUU3QiwrQkFBK0I7UUFDL0IsTUFBQyxHQUFHLENBQUMsQ0FBQztRQUVOLCtCQUErQjtRQUMvQixNQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRU4sd0RBQXdEO1FBQ3hELGFBQVEsR0FBRyxDQUFDLENBQUM7UUFFYix3QkFBd0I7UUFDeEIsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUVYLHdCQUF3QjtRQUN4QixXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRVgsd0JBQXdCO1FBQ3hCLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFFWCx3QkFBd0I7UUFDeEIsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUVYLHVDQUF1QztRQUN2QyxPQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRVAsdUNBQXVDO1FBQ3ZDLE9BQUUsR0FBRyxDQUFDLENBQUM7UUFFUCxnRUFBZ0U7UUFDaEUsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUVkLGdDQUFnQztRQUNoQyxZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBRVosZ0NBQWdDO1FBQ2hDLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFFWixnQ0FBZ0M7UUFDaEMsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUVaLGdD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LFNBQVMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQzNELElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE9BQU87U0FDUDtRQUVELElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUM5QyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBRTlDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDaEMsS0FBSyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFCLElBQUksU0FBUyxHQUFHLFFBQVEsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDO2dCQUN2QyxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ3RELElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDO2dCQUM5QyxJQUFJLEVBQUUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ3RELElBQUksRUFBRSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7Z0JBQzNCLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztnQkFDM0IsT0FBTzthQUNQO1lBQ0QsS0FBSyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ25DLElBQUksU0FBUyxHQUFHLFFBQVEsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQztnQkFDdEQsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztnQkFDOUMsSUFBSSxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQ3RELElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUM7Z0JBQzlDLE1BQU07YUFDTjtZQUNELEtBQUssYUFBYSxDQUFDLHNCQUFzQixD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QUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQy9ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUNuSCxPQUFPO1NBQ1A7UUFDRCxJQUFJLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDbEIsSUFBSSxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLElBQUksRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDbEIsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLEVBQUU7WUFDMUIsSUFBSSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDbEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQ3JFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUN2RDthQUFNO1lBQ04sSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDNUQ7SUFDRixDQUFDO0lBRUQsaUZBQWlGO0lBQ2pGLFlBQVksQ0FBRSxLQUFjO1FBQzNCLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN6RCxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7UUFDcEQsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ3BELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELGlGQUFpRjtJQUNqRixZQUFZLENBQUUsS0FBYztRQUMzQixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdCLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNoRCxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDaEQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsdURBQXVEO0lBQ3ZELG9CQUFvQixDQUFFLGFBQXFCO1FBQzFDLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDOUgsQ0FBQztJQUVELHVEQUF1RDtJQUN2RCxvQkFBb0IsQ0FBRSxhQUFxQjtRQUMxQyxhQUFhLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzdDLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakYsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQztJQUNoRyxDQUFDO0lBRUQ7Ozs0REFHd0Q7SUFDeEQsV0FBVyxDQUFFLE9BQWU7UUFDM0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuRCxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRCJ9