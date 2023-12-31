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
import { Utils } from "../Utils";
export class Sequence {
    constructor(count) {
        this.id = Sequence.nextID();
        this.start = 0;
        this.digits = 0;
        /** The index of the region to show for the setup pose. */
        this.setupIndex = 0;
        this.regions = new Array(count);
    }
    copy() {
        let copy = new Sequence(this.regions.length);
        Utils.arrayCopy(this.regions, 0, copy.regions, 0, this.regions.length);
        copy.start = this.start;
        copy.digits = this.digits;
        copy.setupIndex = this.setupIndex;
        return copy;
    }
    apply(slot, attachment) {
        let index = slot.sequenceIndex;
        if (index == -1)
            index = this.setupIndex;
        if (index >= this.regions.length)
            index = this.regions.length - 1;
        let region = this.regions[index];
        if (attachment.region != region) {
            attachment.region = region;
            attachment.updateRegion();
        }
    }
    getPath(basePath, index) {
        let result = basePath;
        let frame = (this.start + index).toString();
        for (let i = this.digits - frame.length; i > 0; i--)
            result += "0";
        result += frame;
        return result;
    }
    static nextID() {
        return Sequence._nextID++;
    }
}
Sequence._nextID = 0;
export var SequenceMode;
(function (SequenceMode) {
    SequenceMode[SequenceMode["hold"] = 0] = "hold";
    SequenceMode[SequenceMode["once"] = 1] = "once";
    SequenceMode[SequenceMode["loop"] = 2] = "loop";
    SequenceMode[SequenceMode["pingpong"] = 3] = "pingpong";
    SequenceMode[SequenceMode["onceReverse"] = 4] = "onceReverse";
    SequenceMode[SequenceMode["loopReverse"] = 5] = "loopReverse";
    SequenceMode[SequenceMode["pingpongReverse"] = 6] = "pingpongReverse";
})(SequenceMode || (SequenceMode = {}));
export const SequenceModeValues = [
    SequenceMode.hold,
    SequenceMode.once,
    SequenceMode.loop,
    SequenceMode.pingpong,
    SequenceMode.onceReverse,
    SequenceMode.loopReverse,
    SequenceMode.pingpongReverse
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VxdWVuY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYXR0YWNobWVudHMvU2VxdWVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBSy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHakMsTUFBTSxPQUFPLFFBQVE7SUFVcEIsWUFBYSxLQUFhO1FBUDFCLE9BQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFdkIsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFDWCwwREFBMEQ7UUFDMUQsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUdkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQWdCLEtBQUssQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFFLElBQVUsRUFBRSxVQUE0QjtRQUM5QyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBQy9CLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQztZQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3pDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksTUFBTSxFQUFFO1lBQ2hDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUMxQjtJQUNGLENBQUM7SUFFRCxPQUFPLENBQUUsUUFBZ0IsRUFBRSxLQUFhO1FBQ3ZDLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztRQUN0QixJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDbEQsTUFBTSxJQUFJLEdBQUcsQ0FBQztRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUM7UUFDaEIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sTUFBTSxDQUFDLE1BQU07UUFDcEIsT0FBTyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQzs7QUE1Q2MsZ0JBQU8sR0FBRyxDQUFDLENBQUM7QUErQzVCLE1BQU0sQ0FBTixJQUFZLFlBUVg7QUFSRCxXQUFZLFlBQVk7SUFDdkIsK0NBQVEsQ0FBQTtJQUNSLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsdURBQVksQ0FBQTtJQUNaLDZEQUFlLENBQUE7SUFDZiw2REFBZSxDQUFBO0lBQ2YscUVBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQVJXLFlBQVksS0FBWixZQUFZLFFBUXZCO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUc7SUFDakMsWUFBWSxDQUFDLElBQUk7SUFDakIsWUFBWSxDQUFDLElBQUk7SUFDakIsWUFBWSxDQUFDLElBQUk7SUFDakIsWUFBWSxDQUFDLFFBQVE7SUFDckIsWUFBWSxDQUFDLFdBQVc7SUFDeEIsWUFBWSxDQUFDLFdBQVc7SUFDeEIsWUFBWSxDQUFDLGVBQWU7Q0FDNUIsQ0FBQyJ9