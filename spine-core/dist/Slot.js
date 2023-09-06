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
import { Color } from "./Utils";
/** Stores a slot's current pose. Slots organize attachments for {@link Skeleton#drawOrder} purposes and provide a place to store
 * state for an attachment. State cannot be stored in an attachment itself because attachments are stateless and may be shared
 * across multiple skeletons. */
export class Slot {
    constructor(data, bone) {
        /** The dark color used to tint the slot's attachment for two color tinting, or null if two color tinting is not used. The dark
         * color's alpha is not used. */
        this.darkColor = null;
        this.attachment = null;
        this.attachmentState = 0;
        /** The index of the texture region to display when the slot's attachment has a {@link Sequence}. -1 represents the
         * {@link Sequence#getSetupIndex()}. */
        this.sequenceIndex = -1;
        /** Values to deform the slot's attachment. For an unweighted mesh, the entries are local positions for each vertex. For a
         * weighted mesh, the entries are an offset for each vertex which will be added to the mesh's local vertex positions.
         *
         * See {@link VertexAttachment#computeWorldVertices()} and {@link DeformTimeline}. */
        this.deform = new Array();
        if (!data)
            throw new Error("data cannot be null.");
        if (!bone)
            throw new Error("bone cannot be null.");
        this.data = data;
        this.bone = bone;
        this.color = new Color();
        this.darkColor = !data.darkColor ? null : new Color();
        this.setToSetupPose();
    }
    /** The skeleton this slot belongs to. */
    getSkeleton() {
        return this.bone.skeleton;
    }
    /** The current attachment for the slot, or null if the slot has no attachment. */
    getAttachment() {
        return this.attachment;
    }
    /** Sets the slot's attachment and, if the attachment changed, resets {@link #sequenceIndex} and clears the {@link #deform}.
     * The deform is not cleared if the old attachment has the same {@link VertexAttachment#getTimelineAttachment()} as the
     * specified attachment. */
    setAttachment(attachment) {
        if (this.attachment == attachment)
            return;
        if (!(attachment instanceof VertexAttachment) || !(this.attachment instanceof VertexAttachment)
            || attachment.timelineAttachment != this.attachment.timelineAttachment) {
            this.deform.length = 0;
        }
        this.attachment = attachment;
        this.sequenceIndex = -1;
    }
    /** Sets this slot to the setup pose. */
    setToSetupPose() {
        this.color.setFromColor(this.data.color);
        if (this.darkColor)
            this.darkColor.setFromColor(this.data.darkColor);
        if (!this.data.attachmentName)
            this.attachment = null;
        else {
            this.attachment = null;
            this.setAttachment(this.bone.skeleton.getAttachment(this.data.index, this.data.attachmentName));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2xvdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9TbG90LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUUvRSxPQUFPLEVBQWMsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUl4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWhDOztnQ0FFZ0M7QUFDaEMsTUFBTSxPQUFPLElBQUk7SUE2QmhCLFlBQWEsSUFBYyxFQUFFLElBQVU7UUFsQnZDO3dDQUNnQztRQUNoQyxjQUFTLEdBQWlCLElBQUksQ0FBQztRQUUvQixlQUFVLEdBQXNCLElBQUksQ0FBQztRQUVyQyxvQkFBZSxHQUFXLENBQUMsQ0FBQztRQUU1QjsrQ0FDdUM7UUFDdkMsa0JBQWEsR0FBVyxDQUFDLENBQUMsQ0FBQztRQUUzQjs7OzZGQUdxRjtRQUNyRixXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQVUsQ0FBQztRQUc1QixJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsSUFBSTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN0RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELHlDQUF5QztJQUN6QyxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUMzQixDQUFDO0lBRUQsa0ZBQWtGO0lBQ2xGLGFBQWE7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVEOzsrQkFFMkI7SUFDM0IsYUFBYSxDQUFFLFVBQTZCO1FBQzNDLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxVQUFVO1lBQUUsT0FBTztRQUMxQyxJQUFJLENBQUMsQ0FBQyxVQUFVLFlBQVksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsWUFBWSxnQkFBZ0IsQ0FBQztlQUN4RSxVQUFXLENBQUMsa0JBQWtCLElBQXVCLElBQUksQ0FBQyxVQUFXLENBQUMsa0JBQWtCLEVBQUU7WUFDaEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLGNBQWM7UUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLElBQUksSUFBSSxDQUFDLFNBQVM7WUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVUsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDbkI7WUFDSixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7U0FDaEc7SUFDRixDQUFDO0NBQ0QifQ==