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
/** Stores the setup pose and all of the stateless data for a skeleton.
 *
 * See [Data objects](http://esotericsoftware.com/spine-runtime-architecture#Data-objects) in the Spine Runtimes
 * Guide. */
export class SkeletonData {
    constructor() {
        /** The skeleton's name, which by default is the name of the skeleton data file, if possible. May be null. */
        this.name = null;
        /** The skeleton's bones, sorted parent first. The root bone is always the first bone. */
        this.bones = new Array(); // Ordered parents first.
        /** The skeleton's slots. */
        this.slots = new Array(); // Setup pose draw order.
        this.skins = new Array();
        /** The skeleton's default skin. By default this skin contains all attachments that were not in a skin in Spine.
         *
         * See {@link Skeleton#getAttachmentByName()}.
         * May be null. */
        this.defaultSkin = null;
        /** The skeleton's events. */
        this.events = new Array();
        /** The skeleton's animations. */
        this.animations = new Array();
        /** The skeleton's IK constraints. */
        this.ikConstraints = new Array();
        /** The skeleton's transform constraints. */
        this.transformConstraints = new Array();
        /** The skeleton's path constraints. */
        this.pathConstraints = new Array();
        /** The X coordinate of the skeleton's axis aligned bounding box in the setup pose. */
        this.x = 0;
        /** The Y coordinate of the skeleton's axis aligned bounding box in the setup pose. */
        this.y = 0;
        /** The width of the skeleton's axis aligned bounding box in the setup pose. */
        this.width = 0;
        /** The height of the skeleton's axis aligned bounding box in the setup pose. */
        this.height = 0;
        /** The Spine version used to export the skeleton data, or null. */
        this.version = null;
        /** The skeleton data hash. This value will change if any of the skeleton data has changed. May be null. */
        this.hash = null;
        // Nonessential
        /** The dopesheet FPS in Spine. Available only when nonessential data was exported. */
        this.fps = 0;
        /** The path to the images directory as defined in Spine. Available only when nonessential data was exported. May be null. */
        this.imagesPath = null;
        /** The path to the audio directory as defined in Spine. Available only when nonessential data was exported. May be null. */
        this.audioPath = null;
    }
    /** Finds a bone by comparing each bone's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findBone(boneName) {
        if (!boneName)
            throw new Error("boneName cannot be null.");
        let bones = this.bones;
        for (let i = 0, n = bones.length; i < n; i++) {
            let bone = bones[i];
            if (bone.name == boneName)
                return bone;
        }
        return null;
    }
    /** Finds a slot by comparing each slot's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findSlot(slotName) {
        if (!slotName)
            throw new Error("slotName cannot be null.");
        let slots = this.slots;
        for (let i = 0, n = slots.length; i < n; i++) {
            let slot = slots[i];
            if (slot.name == slotName)
                return slot;
        }
        return null;
    }
    /** Finds a skin by comparing each skin's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findSkin(skinName) {
        if (!skinName)
            throw new Error("skinName cannot be null.");
        let skins = this.skins;
        for (let i = 0, n = skins.length; i < n; i++) {
            let skin = skins[i];
            if (skin.name == skinName)
                return skin;
        }
        return null;
    }
    /** Finds an event by comparing each events's name. It is more efficient to cache the results of this method than to call it
     * multiple times.
     * @returns May be null. */
    findEvent(eventDataName) {
        if (!eventDataName)
            throw new Error("eventDataName cannot be null.");
        let events = this.events;
        for (let i = 0, n = events.length; i < n; i++) {
            let event = events[i];
            if (event.name == eventDataName)
                return event;
        }
        return null;
    }
    /** Finds an animation by comparing each animation's name. It is more efficient to cache the results of this method than to
     * call it multiple times.
     * @returns May be null. */
    findAnimation(animationName) {
        if (!animationName)
            throw new Error("animationName cannot be null.");
        let animations = this.animations;
        for (let i = 0, n = animations.length; i < n; i++) {
            let animation = animations[i];
            if (animation.name == animationName)
                return animation;
        }
        return null;
    }
    /** Finds an IK constraint by comparing each IK constraint's name. It is more efficient to cache the results of this method
     * than to call it multiple times.
     * @return May be null. */
    findIkConstraint(constraintName) {
        if (!constraintName)
            throw new Error("constraintName cannot be null.");
        let ikConstraints = this.ikConstraints;
        for (let i = 0, n = ikConstraints.length; i < n; i++) {
            let constraint = ikConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    }
    /** Finds a transform constraint by comparing each transform constraint's name. It is more efficient to cache the results of
     * this method than to call it multiple times.
     * @return May be null. */
    findTransformConstraint(constraintName) {
        if (!constraintName)
            throw new Error("constraintName cannot be null.");
        let transformConstraints = this.transformConstraints;
        for (let i = 0, n = transformConstraints.length; i < n; i++) {
            let constraint = transformConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    }
    /** Finds a path constraint by comparing each path constraint's name. It is more efficient to cache the results of this method
     * than to call it multiple times.
     * @return May be null. */
    findPathConstraint(constraintName) {
        if (!constraintName)
            throw new Error("constraintName cannot be null.");
        let pathConstraints = this.pathConstraints;
        for (let i = 0, n = pathConstraints.length; i < n; i++) {
            let constraint = pathConstraints[i];
            if (constraint.name == constraintName)
                return constraint;
        }
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2tlbGV0b25EYXRhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NrZWxldG9uRGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFXL0U7OztZQUdZO0FBQ1osTUFBTSxPQUFPLFlBQVk7SUFBekI7UUFFQyw2R0FBNkc7UUFDN0csU0FBSSxHQUFrQixJQUFJLENBQUM7UUFFM0IseUZBQXlGO1FBQ3pGLFVBQUssR0FBRyxJQUFJLEtBQUssRUFBWSxDQUFDLENBQUMseUJBQXlCO1FBRXhELDRCQUE0QjtRQUM1QixVQUFLLEdBQUcsSUFBSSxLQUFLLEVBQVksQ0FBQyxDQUFDLHlCQUF5QjtRQUN4RCxVQUFLLEdBQUcsSUFBSSxLQUFLLEVBQVEsQ0FBQztRQUUxQjs7OzBCQUdrQjtRQUNsQixnQkFBVyxHQUFnQixJQUFJLENBQUM7UUFFaEMsNkJBQTZCO1FBQzdCLFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBYSxDQUFDO1FBRWhDLGlDQUFpQztRQUNqQyxlQUFVLEdBQUcsSUFBSSxLQUFLLEVBQWEsQ0FBQztRQUVwQyxxQ0FBcUM7UUFDckMsa0JBQWEsR0FBRyxJQUFJLEtBQUssRUFBb0IsQ0FBQztRQUU5Qyw0Q0FBNEM7UUFDNUMseUJBQW9CLEdBQUcsSUFBSSxLQUFLLEVBQTJCLENBQUM7UUFFNUQsdUNBQXVDO1FBQ3ZDLG9CQUFlLEdBQUcsSUFBSSxLQUFLLEVBQXNCLENBQUM7UUFFbEQsc0ZBQXNGO1FBQ3RGLE1BQUMsR0FBVyxDQUFDLENBQUM7UUFFZCxzRkFBc0Y7UUFDdEYsTUFBQyxHQUFXLENBQUMsQ0FBQztRQUVkLCtFQUErRTtRQUMvRSxVQUFLLEdBQVcsQ0FBQyxDQUFDO1FBRWxCLGdGQUFnRjtRQUNoRixXQUFNLEdBQVcsQ0FBQyxDQUFDO1FBRW5CLG1FQUFtRTtRQUNuRSxZQUFPLEdBQWtCLElBQUksQ0FBQztRQUU5QiwyR0FBMkc7UUFDM0csU0FB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