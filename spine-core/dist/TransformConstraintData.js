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
import { ConstraintData } from "./ConstraintData";
/** Stores the setup pose for a {@link TransformConstraint}.
 *
 * See [Transform constraints](http://esotericsoftware.com/spine-transform-constraints) in the Spine User Guide. */
export class TransformConstraintData extends ConstraintData {
    set target(boneData) { this._target = boneData; }
    get target() {
        if (!this._target)
            throw new Error("BoneData not set.");
        else
            return this._target;
    }
    constructor(name) {
        super(name, 0, false);
        /** The bones that will be modified by this transform constraint. */
        this.bones = new Array();
        /** The target bone whose world transform will be copied to the constrained bones. */
        this._target = null;
        this.mixRotate = 0;
        this.mixX = 0;
        this.mixY = 0;
        this.mixScaleX = 0;
        this.mixScaleY = 0;
        this.mixShearY = 0;
        /** An offset added to the constrained bone rotation. */
        this.offsetRotation = 0;
        /** An offset added to the constrained bone X translation. */
        this.offsetX = 0;
        /** An offset added to the constrained bone Y translation. */
        this.offsetY = 0;
        /** An offset added to the constrained bone scaleX. */
        this.offsetScaleX = 0;
        /** An offset added to the constrained bone scaleY. */
        this.offsetScaleY = 0;
        /** An offset added to the constrained bone shearY. */
        this.offsetShearY = 0;
        this.relative = false;
        this.local = false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhbnNmb3JtQ29uc3RyYWludERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVHJhbnNmb3JtQ29uc3RyYWludERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRS9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUdsRDs7bUhBRW1IO0FBQ25ILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxjQUFjO0lBTzFELElBQVcsTUFBTSxDQUFFLFFBQWtCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ25FLElBQVcsTUFBTTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU87WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUE7O1lBQ2xELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUMxQixDQUFDO0lBOEJELFlBQWEsSUFBWTtRQUN4QixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQXhDdkIsb0VBQW9FO1FBQ3BFLFVBQUssR0FBRyxJQUFJLEtBQUssRUFBWSxDQUFDO1FBRTlCLHFGQUFxRjtRQUM3RSxZQUFPLEdBQW9CLElBQUksQ0FBQztRQU94QyxjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsU0FBSSxHQUFHLENBQUMsQ0FBQztRQUNULFNBQUksR0FBRyxDQUFDLENBQUM7UUFDVCxjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLGNBQVMsR0FBRyxDQUFDLENBQUM7UUFFZCx3REFBd0Q7UUFDeEQsbUJBQWMsR0FBRyxDQUFDLENBQUM7UUFFbkIsNkRBQTZEO1FBQzdELFlBQU8sR0FBRyxDQUFDLENBQUM7UUFFWiw2REFBNkQ7UUFDN0QsWUFBTyxHQUFHLENBQUMsQ0FBQztRQUVaLHNEQUFzRDtRQUN0RCxpQkFBWSxHQUFHLENBQUMsQ0FBQztRQUVqQixzREFBc0Q7UUFDdEQsaUJBQVksR0FBRyxDQUFDLENBQUM7UUFFakIsc0RBQXNEO1FBQ3RELGlCQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRWpCLGFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsVUFBSyxHQUFHLEtBQUssQ0FBQztJQUlkLENBQUM7Q0FDRCJ9