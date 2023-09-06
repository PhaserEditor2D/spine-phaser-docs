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
/** Stores the setup pose for a {@link PathConstraint}.
 *
 * See [path constraints](http://esotericsoftware.com/spine-path-constraints) in the Spine User Guide. */
export class PathConstraintData extends ConstraintData {
    set target(slotData) { this._target = slotData; }
    get target() {
        if (!this._target)
            throw new Error("SlotData not set.");
        else
            return this._target;
    }
    constructor(name) {
        super(name, 0, false);
        /** The bones that will be modified by this path constraint. */
        this.bones = new Array();
        /** The slot whose path attachment will be used to constrained the bones. */
        this._target = null;
        /** The mode for positioning the first bone on the path. */
        this.positionMode = PositionMode.Fixed;
        /** The mode for positioning the bones after the first bone on the path. */
        this.spacingMode = SpacingMode.Fixed;
        /** The mode for adjusting the rotation of the bones. */
        this.rotateMode = RotateMode.Chain;
        /** An offset added to the constrained bone rotation. */
        this.offsetRotation = 0;
        /** The position along the path. */
        this.position = 0;
        /** The spacing between bones. */
        this.spacing = 0;
        this.mixRotate = 0;
        this.mixX = 0;
        this.mixY = 0;
    }
}
/** Controls how the first bone is positioned along the path.
 *
 * See [position](http://esotericsoftware.com/spine-path-constraints#Position) in the Spine User Guide. */
export var PositionMode;
(function (PositionMode) {
    PositionMode[PositionMode["Fixed"] = 0] = "Fixed";
    PositionMode[PositionMode["Percent"] = 1] = "Percent";
})(PositionMode || (PositionMode = {}));
/** Controls how bones after the first bone are positioned along the path.
 *
 * See [spacing](http://esotericsoftware.com/spine-path-constraints#Spacing) in the Spine User Guide. */
export var SpacingMode;
(function (SpacingMode) {
    SpacingMode[SpacingMode["Length"] = 0] = "Length";
    SpacingMode[SpacingMode["Fixed"] = 1] = "Fixed";
    SpacingMode[SpacingMode["Percent"] = 2] = "Percent";
    SpacingMode[SpacingMode["Proportional"] = 3] = "Proportional";
})(SpacingMode || (SpacingMode = {}));
/** Controls how bones are rotated, translated, and scaled to match the path.
 *
 * See [rotate mix](http://esotericsoftware.com/spine-path-constraints#Rotate-mix) in the Spine User Guide. */
export var RotateMode;
(function (RotateMode) {
    RotateMode[RotateMode["Tangent"] = 0] = "Tangent";
    RotateMode[RotateMode["Chain"] = 1] = "Chain";
    RotateMode[RotateMode["ChainScale"] = 2] = "ChainScale";
})(RotateMode || (RotateMode = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF0aENvbnN0cmFpbnREYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1BhdGhDb25zdHJhaW50RGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFHL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSWxEOzt5R0FFeUc7QUFDekcsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGNBQWM7SUFPckQsSUFBVyxNQUFNLENBQUUsUUFBa0IsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDbkUsSUFBVyxNQUFNO1FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTztZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQTs7WUFDbEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQzFCLENBQUM7SUF3QkQsWUFBYSxJQUFZO1FBQ3hCLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBbEN2QiwrREFBK0Q7UUFDL0QsVUFBSyxHQUFHLElBQUksS0FBSyxFQUFZLENBQUM7UUFFOUIsNEVBQTRFO1FBQ3BFLFlBQU8sR0FBb0IsSUFBSSxDQUFDO1FBT3hDLDJEQUEyRDtRQUMzRCxpQkFBWSxHQUFpQixZQUFZLENBQUMsS0FBSyxDQUFDO1FBRWhELDJFQUEyRTtRQUMzRSxnQkFBVyxHQUFnQixXQUFXLENBQUMsS0FBSyxDQUFDO1FBRTdDLHdEQUF3RDtRQUN4RCxlQUFVLEdBQWUsVUFBVSxDQUFDLEtBQUssQ0FBQztRQUUxQyx3REFBd0Q7UUFDeEQsbUJBQWMsR0FBVyxDQUFDLENBQUM7UUFFM0IsbUNBQW1DO1FBQ25DLGFBQVEsR0FBVyxDQUFDLENBQUM7UUFFckIsaUNBQWlDO1FBQ2pDLFlBQU8sR0FBVyxDQUFDLENBQUM7UUFFcEIsY0FBUyxHQUFHLENBQUMsQ0FBQztRQUNkLFNBQUksR0FBRyxDQUFDLENBQUM7UUFDVCxTQUFJLEdBQUcsQ0FBQyxDQUFDO0lBSVQsQ0FBQztDQUNEO0FBRUQ7OzBHQUUwRztBQUMxRyxNQUFNLENBQU4sSUFBWSxZQUErQjtBQUEzQyxXQUFZLFlBQVk7SUFBRyxpREFBSyxDQUFBO0lBQUUscURBQU8sQ0FBQTtBQUFDLENBQUMsRUFBL0IsWUFBWSxLQUFaLFlBQVksUUFBbUI7QUFFM0M7O3dHQUV3RztBQUN4RyxNQUFNLENBQU4sSUFBWSxXQUFvRDtBQUFoRSxXQUFZLFdBQVc7SUFBRyxpREFBTSxDQUFBO0lBQUUsK0NBQUssQ0FBQTtJQUFFLG1EQUFPLENBQUE7SUFBRSw2REFBWSxDQUFBO0FBQUMsQ0FBQyxFQUFwRCxXQUFXLEtBQVgsV0FBVyxRQUF5QztBQUVoRTs7OEdBRThHO0FBQzlHLE1BQU0sQ0FBTixJQUFZLFVBQXlDO0FBQXJELFdBQVksVUFBVTtJQUFHLGlEQUFPLENBQUE7SUFBRSw2Q0FBSyxDQUFBO0lBQUUsdURBQVUsQ0FBQTtBQUFDLENBQUMsRUFBekMsVUFBVSxLQUFWLFVBQVUsUUFBK0IifQ==