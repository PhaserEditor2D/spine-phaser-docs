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
import { MeshAttachment } from "./attachments/MeshAttachment";
/** Stores an entry in the skin consisting of the slot index, name, and attachment **/
export class SkinEntry {
    constructor(slotIndex = 0, name, attachment) {
        this.slotIndex = slotIndex;
        this.name = name;
        this.attachment = attachment;
    }
}
/** Stores attachments by slot index and attachment name.
 *
 * See SkeletonData {@link SkeletonData#defaultSkin}, Skeleton {@link Skeleton#skin}, and
 * [Runtime skins](http://esotericsoftware.com/spine-runtime-skins) in the Spine Runtimes Guide. */
export class Skin {
    constructor(name) {
        this.attachments = new Array();
        this.bones = Array();
        this.constraints = new Array();
        if (!name)
            throw new Error("name cannot be null.");
        this.name = name;
    }
    /** Adds an attachment to the skin for the specified slot index and name. */
    setAttachment(slotIndex, name, attachment) {
        if (!attachment)
            throw new Error("attachment cannot be null.");
        let attachments = this.attachments;
        if (slotIndex >= attachments.length)
            attachments.length = slotIndex + 1;
        if (!attachments[slotIndex])
            attachments[slotIndex] = {};
        attachments[slotIndex][name] = attachment;
    }
    /** Adds all attachments, bones, and constraints from the specified skin to this skin. */
    addSkin(skin) {
        for (let i = 0; i < skin.bones.length; i++) {
            let bone = skin.bones[i];
            let contained = false;
            for (let ii = 0; ii < this.bones.length; ii++) {
                if (this.bones[ii] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained)
                this.bones.push(bone);
        }
        for (let i = 0; i < skin.constraints.length; i++) {
            let constraint = skin.constraints[i];
            let contained = false;
            for (let ii = 0; ii < this.constraints.length; ii++) {
                if (this.constraints[ii] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained)
                this.constraints.push(constraint);
        }
        let attachments = skin.getAttachments();
        for (let i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
        }
    }
    /** Adds all bones and constraints and copies of all attachments from the specified skin to this skin. Mesh attachments are not
     * copied, instead a new linked mesh is created. The attachment copies can be modified without affecting the originals. */
    copySkin(skin) {
        for (let i = 0; i < skin.bones.length; i++) {
            let bone = skin.bones[i];
            let contained = false;
            for (let ii = 0; ii < this.bones.length; ii++) {
                if (this.bones[ii] == bone) {
                    contained = true;
                    break;
                }
            }
            if (!contained)
                this.bones.push(bone);
        }
        for (let i = 0; i < skin.constraints.length; i++) {
            let constraint = skin.constraints[i];
            let contained = false;
            for (let ii = 0; ii < this.constraints.length; ii++) {
                if (this.constraints[ii] == constraint) {
                    contained = true;
                    break;
                }
            }
            if (!contained)
                this.constraints.push(constraint);
        }
        let attachments = skin.getAttachments();
        for (let i = 0; i < attachments.length; i++) {
            var attachment = attachments[i];
            if (!attachment.attachment)
                continue;
            if (attachment.attachment instanceof MeshAttachment) {
                attachment.attachment = attachment.attachment.newLinkedMesh();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            }
            else {
                attachment.attachment = attachment.attachment.copy();
                this.setAttachment(attachment.slotIndex, attachment.name, attachment.attachment);
            }
        }
    }
    /** Returns the attachment for the specified slot index and name, or null. */
    getAttachment(slotIndex, name) {
        let dictionary = this.attachments[slotIndex];
        return dictionary ? dictionary[name] : null;
    }
    /** Removes the attachment in the skin for the specified slot index and name, if any. */
    removeAttachment(slotIndex, name) {
        let dictionary = this.attachments[slotIndex];
        if (dictionary)
            delete dictionary[name];
    }
    /** Returns all attachments in this skin. */
    getAttachments() {
        let entries = new Array();
        for (var i = 0; i < this.attachments.length; i++) {
            let slotAttachments = this.attachments[i];
            if (slotAttachments) {
                for (let name in slotAttachments) {
                    let attachment = slotAttachments[name];
                    if (attachment)
                        entries.push(new SkinEntry(i, name, attachment));
                }
            }
        }
        return entries;
    }
    /** Returns all attachments in this skin for the specified slot index. */
    getAttachmentsForSlot(slotIndex, attachments) {
        let slotAttachments = this.attachments[slotIndex];
        if (slotAttachments) {
            for (let name in slotAttachments) {
                let attachment = slotAttachments[name];
                if (attachment)
                    attachments.push(new SkinEntry(slotIndex, name, attachment));
            }
        }
    }
    /** Clears all attachments, bones, and constraints. */
    clear() {
        this.attachments.length = 0;
        this.bones.length = 0;
        this.constraints.length = 0;
    }
    /** Attach each attachment in this skin if the corresponding attachment in the old skin is currently attached. */
    attachAll(skeleton, oldSkin) {
        let slotIndex = 0;
        for (let i = 0; i < skeleton.slots.length; i++) {
            let slot = skeleton.slots[i];
            let slotAttachment = slot.getAttachment();
            if (slotAttachment && slotIndex < oldSkin.attachments.length) {
                let dictionary = oldSkin.attachments[slotIndex];
                for (let key in dictionary) {
                    let skinAttachment = dictionary[key];
                    if (slotAttachment == skinAttachment) {
                        let attachment = this.getAttachment(slotIndex, key);
                        if (attachment)
                            slot.setAttachment(attachment);
                        break;
                    }
                }
            }
            slotIndex++;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2tpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Ta2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUcvRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFNOUQsc0ZBQXNGO0FBQ3RGLE1BQU0sT0FBTyxTQUFTO0lBQ3JCLFlBQW9CLFlBQW9CLENBQUMsRUFBUyxJQUFZLEVBQVMsVUFBc0I7UUFBekUsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUFTLFNBQUksR0FBSixJQUFJLENBQVE7UUFBUyxlQUFVLEdBQVYsVUFBVSxDQUFZO0lBQUksQ0FBQztDQUNsRztBQUVEOzs7bUdBR21HO0FBQ25HLE1BQU0sT0FBTyxJQUFJO0lBUWhCLFlBQWEsSUFBWTtRQUp6QixnQkFBVyxHQUFHLElBQUksS0FBSyxFQUF5QixDQUFDO1FBQ2pELFVBQUssR0FBRyxLQUFLLEVBQVksQ0FBQztRQUMxQixnQkFBVyxHQUFHLElBQUksS0FBSyxFQUFrQixDQUFDO1FBR3pDLElBQUksQ0FBQyxJQUFJO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCw0RUFBNEU7SUFDNUUsYUFBYSxDQUFFLFNBQWlCLEVBQUUsSUFBWSxFQUFFLFVBQXNCO1FBQ3JFLElBQUksQ0FBQyxVQUFVO1lBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQy9ELElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDbkMsSUFBSSxTQUFTLElBQUksV0FBVyxDQUFDLE1BQU07WUFBRSxXQUFXLENBQUMsTUFBTSxHQUFHLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFBRSxX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