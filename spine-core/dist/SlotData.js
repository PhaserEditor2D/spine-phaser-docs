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
import { Color } from "./Utils";
/** Stores the setup pose for a {@link Slot}. */
export class SlotData {
    constructor(index, name, boneData) {
        /** The index of the slot in {@link Skeleton#getSlots()}. */
        this.index = 0;
        /** The color used to tint the slot's attachment. If {@link #getDarkColor()} is set, this is used as the light color for two
         * color tinting. */
        this.color = new Color(1, 1, 1, 1);
        /** The dark color used to tint the slot's attachment for two color tinting, or null if two color tinting is not used. The dark
         * color's alpha is not used. */
        this.darkColor = null;
        /** The name of the attachment that is visible for this slot in the setup pose, or null if no attachment is visible. */
        this.attachmentName = null;
        /** The blend mode for drawing the slot's attachment. */
        this.blendMode = BlendMode.Normal;
        if (index < 0)
            throw new Error("index must be >= 0.");
        if (!name)
            throw new Error("name cannot be null.");
        if (!boneData)
            throw new Error("boneData cannot be null.");
        this.index = index;
        this.name = name;
        this.boneData = boneData;
    }
}
/** Determines how images are blended with existing pixels when drawn. */
export var BlendMode;
(function (BlendMode) {
    BlendMode[BlendMode["Normal"] = 0] = "Normal";
    BlendMode[BlendMode["Additive"] = 1] = "Additive";
    BlendMode[BlendMode["Multiply"] = 2] = "Multiply";
    BlendMode[BlendMode["Screen"] = 3] = "Screen";
})(BlendMode || (BlendMode = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2xvdERhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvU2xvdERhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFFaEMsZ0RBQWdEO0FBQ2hELE1BQU0sT0FBTyxRQUFRO0lBd0JwQixZQUFhLEtBQWEsRUFBRSxJQUFZLEVBQUUsUUFBa0I7UUF2QjVELDREQUE0RDtRQUM1RCxVQUFLLEdBQVcsQ0FBQyxDQUFDO1FBUWxCOzRCQUNvQjtRQUNwQixVQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUI7d0NBQ2dDO1FBQ2hDLGNBQVMsR0FBaUIsSUFBSSxDQUFDO1FBRS9CLHVIQUF1SDtRQUN2SCxtQkFBYyxHQUFrQixJQUFJLENBQUM7UUFFckMsd0RBQXdEO1FBQ3hELGNBQVMsR0FBYyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBR3ZDLElBQUksS0FBSyxHQUFHLENBQUM7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLFFBQVE7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztDQUNEO0FBRUQseUVBQXlFO0FBQ3pFLE1BQU0sQ0FBTixJQUFZLFNBQWdEO0FBQTVELFdBQVksU0FBUztJQUFHLDZDQUFNLENBQUE7SUFBRSxpREFBUSxDQUFBO0lBQUUsaURBQVEsQ0FBQTtJQUFFLDZDQUFNLENBQUE7QUFBQyxDQUFDLEVBQWhELFNBQVMsS0FBVCxTQUFTLFFBQXVDIn0=