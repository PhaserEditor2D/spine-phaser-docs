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
import { Color, Utils } from "../Utils";
import { Attachment } from "./Attachment";
/** An attachment that displays a textured quadrilateral.
 *
 * See [Region attachments](http://esotericsoftware.com/spine-regions) in the Spine User Guide. */
export class RegionAttachment extends Attachment {
    constructor(name, path) {
        super(name);
        /** The local x translation. */
        this.x = 0;
        /** The local y translation. */
        this.y = 0;
        /** The local scaleX. */
        this.scaleX = 1;
        /** The local scaleY. */
        this.scaleY = 1;
        /** The local rotation. */
        this.rotation = 0;
        /** The width of the region attachment in Spine. */
        this.width = 0;
        /** The height of the region attachment in Spine. */
        this.height = 0;
        /** The color to tint the region attachment. */
        this.color = new Color(1, 1, 1, 1);
        this.region = null;
        this.sequence = null;
        /** For each of the 4 vertices, a pair of <code>x,y</code> values that is the local position of the vertex.
         *
         * See {@link #updateOffset()}. */
        this.offset = Utils.newFloatArray(8);
        this.uvs = Utils.newFloatArray(8);
        this.tempColor = new Color(1, 1, 1, 1);
        this.path = path;
    }
    /** Calculates the {@link #offset} using the region settings. Must be called after changing region settings. */
    updateRegion() {
        if (!this.region)
            throw new Error("Region not set.");
        let region = this.region;
        let uvs = this.uvs;
        if (region == null) {
            uvs[0] = 0;
            uvs[1] = 0;
            uvs[2] = 0;
            uvs[3] = 1;
            uvs[4] = 1;
            uvs[5] = 1;
            uvs[6] = 1;
            uvs[7] = 0;
            return;
        }
        let regionScaleX = this.width / this.region.originalWidth * this.scaleX;
        let regionScaleY = this.height / this.region.originalHeight * this.scaleY;
        let localX = -this.width / 2 * this.scaleX + this.region.offsetX * regionScaleX;
        let localY = -this.height / 2 * this.scaleY + this.region.offsetY * regionScaleY;
        let localX2 = localX + this.region.width * regionScaleX;
        let localY2 = localY + this.region.height * regionScaleY;
        let radians = this.rotation * Math.PI / 180;
        let cos = Math.cos(radians);
        let sin = Math.sin(radians);
        let x = this.x, y = this.y;
        let localXCos = localX * cos + x;
        let localXSin = localX * sin;
        let localYCos = localY * cos + y;
        let localYSin = localY * sin;
        let localX2Cos = localX2 * cos + x;
        let localX2Sin = localX2 * sin;
        let localY2Cos = localY2 * cos + y;
        let localY2Sin = localY2 * sin;
        let offset = this.offset;
        offset[0] = localXCos - localYSin;
        offset[1] = localYCos + localXSin;
        offset[2] = localXCos - localY2Sin;
        offset[3] = localY2Cos + localXSin;
        offset[4] = localX2Cos - localY2Sin;
        offset[5] = localY2Cos + localX2Sin;
        offset[6] = localX2Cos - localYSin;
        offset[7] = localYCos + localX2Sin;
        if (region.degrees == 90) {
            uvs[0] = region.u2;
            uvs[1] = region.v2;
            uvs[2] = region.u;
            uvs[3] = region.v2;
            uvs[4] = region.u;
            uvs[5] = region.v;
            uvs[6] = region.u2;
            uvs[7] = region.v;
        }
        else {
            uvs[0] = region.u;
            uvs[1] = region.v2;
            uvs[2] = region.u;
            uvs[3] = region.v;
            uvs[4] = region.u2;
            uvs[5] = region.v;
            uvs[6] = region.u2;
            uvs[7] = region.v2;
        }
    }
    /** Transforms the attachment's four vertices to world coordinates. If the attachment has a {@link #sequence}, the region may
     * be changed.
     * <p>
     * See <a href="http://esotericsoftware.com/spine-runtime-skeletons#World-transforms">World transforms</a> in the Spine
     * Runtimes Guide.
     * @param worldVertices The output world vertices. Must have a length >= <code>offset</code> + 8.
     * @param offset The <code>worldVertices</code> index to begin writing values.
     * @param stride The number of <code>worldVertices</code> entries between the value pairs written. */
    computeWorldVertices(slot, worldVertices, offset, stride) {
        if (this.sequence != null)
            this.sequence.apply(slot, this);
        let bone = slot.bone;
        let vertexOffset = this.offset;
        let x = bone.worldX, y = bone.worldY;
        let a = bone.a, b = bone.b, c = bone.c, d = bone.d;
        let offsetX = 0, offsetY = 0;
        offsetX = vertexOffset[0];
        offsetY = vertexOffset[1];
        worldVertices[offset] = offsetX * a + offsetY * b + x; // br
        worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
        offset += stride;
        offsetX = vertexOffset[2];
        offsetY = vertexOffset[3];
        worldVertices[offset] = offsetX * a + offsetY * b + x; // bl
        worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
        offset += stride;
        offsetX = vertexOffset[4];
        offsetY = vertexOffset[5];
        worldVertices[offset] = offsetX * a + offsetY * b + x; // ul
        worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
        offset += stride;
        offsetX = vertexOffset[6];
        offsetY = vertexOffset[7];
        worldVertices[offset] = offsetX * a + offsetY * b + x; // ur
        worldVertices[offset + 1] = offsetX * c + offsetY * d + y;
    }
    copy() {
        let copy = new RegionAttachment(this.name, this.path);
        copy.region = this.region;
        copy.x = this.x;
        copy.y = this.y;
        copy.scaleX = this.scaleX;
        copy.scaleY = this.scaleY;
        copy.rotation = this.rotation;
        copy.width = this.width;
        copy.height = this.height;
        Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, 8);
        Utils.arrayCopy(this.offset, 0, copy.offset, 0, 8);
        copy.color.setFromColor(this.color);
        copy.sequence = this.sequence != null ? this.sequence.copy() : null;
        return copy;
    }
}
RegionAttachment.X1 = 0;
RegionAttachment.Y1 = 1;
RegionAttachment.C1R = 2;
RegionAttachment.C1G = 3;
RegionAttachment.C1B = 4;
RegionAttachment.C1A = 5;
RegionAttachment.U1 = 6;
RegionAttachment.V1 = 7;
RegionAttachment.X2 = 8;
RegionAttachment.Y2 = 9;
RegionAttachment.C2R = 10;
RegionAttachment.C2G = 11;
RegionAttachment.C2B = 12;
RegionAttachment.C2A = 13;
RegionAttachment.U2 = 14;
RegionAttachment.V2 = 15;
RegionAttachment.X3 = 16;
RegionAttachment.Y3 = 17;
RegionAttachment.C3R = 18;
RegionAttachment.C3G = 19;
RegionAttachment.C3B = 20;
RegionAttachment.C3A = 21;
RegionAttachment.U3 = 22;
RegionAttachment.V3 = 23;
RegionAttachment.X4 = 24;
RegionAttachment.Y4 = 25;
RegionAttachment.C4R = 26;
RegionAttachment.C4G = 27;
RegionAttachment.C4B = 28;
RegionAttachment.C4A = 29;
RegionAttachment.U4 = 30;
RegionAttachment.V4 = 31;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaW9uQXR0YWNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hdHRhY2htZW50cy9SZWdpb25BdHRhY2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUkvRSxPQUFPLEVBQUUsS0FBSyxFQUFtQixLQUFLLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUsxQzs7a0dBRWtHO0FBQ2xHLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBd0MvQyxZQUFhLElBQVksRUFBRSxJQUFZO1FBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQXhDYiwrQkFBK0I7UUFDL0IsTUFBQyxHQUFHLENBQUMsQ0FBQztRQUVOLCtCQUErQjtRQUMvQixNQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRU4sd0JBQXdCO1FBQ3hCLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFFWCx3QkFBd0I7UUFDeEIsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUVYLDBCQUEwQjtRQUMxQixhQUFRLEdBQUcsQ0FBQyxDQUFDO1FBRWIsbURBQW1EO1FBQ25ELFVBQUssR0FBRyxDQUFDLENBQUM7UUFFVixvREFBb0Q7UUFDcEQsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUVYLCtDQUErQztRQUMvQyxVQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFLOUIsV0FBTSxHQUF5QixJQUFJLENBQUM7UUFDcEMsYUFBUSxHQUFvQixJQUFJLENBQUM7UUFFakM7OzBDQUVrQztRQUNsQyxXQUFNLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVoQyxRQUFHLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztR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QztRQUNuQyxJQUFJLFVBQVUsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDO1FBQy9CLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxVQUFVLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxTQUFTLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxVQUFVLENBQUM7UUFFbkMsSUFBSSxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsRUFBRTtZQUN6QixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuQixHQUFH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LFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ3BFLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQzs7QUFFTSxtQkFBRSxHQUFHLENBQUMsQ0FBQztBQUNQLG1CQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ1Asb0JBQUcsR0FBRyxDQUFDLENBQUM7QUFDUixvQkFBRyxHQUFHLENBQUMsQ0FBQztBQUNSLG9CQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ1Isb0JBQUcsR0FBRyxDQUFDLENBQUM7QUFDUixtQkFBRSxHQUFHLENBQUMsQ0FBQztBQUNQLG1CQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRVAsbUJBQUUsR0FBRyxDQUFDLENBQUM7QUFDUCxtQkFBRSxHQUFHLENBQUMsQ0FBQztBQUNQLG9CQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ1Qsb0JBQUcsR0FBRyxFQUFFLENBQUM7QUFDVCxvQkFBRyxHQUFHLEVBQUUsQ0FBQztBQUNULG9CQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ1QsbUJBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixtQkFBRSxHQUFHLEVBQUUsQ0FBQztBQUVSLG1CQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ1IsbUJBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixvQkFBRyxHQUFHLEVBQUUsQ0FBQztBQUNULG9CQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ1Qsb0JBQUcsR0FBRyxFQUFFLENBQUM7QUFDVCxvQkFBRyxHQUFHLEVBQUUsQ0FBQztBQUNULG1CQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ1IsbUJBQUUsR0FBRyxFQUFFLENBQUM7QUFFUixtQkFBRSxHQUFHLEVBQUUsQ0FBQztBQUNSLG1CQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ1Isb0JBQUcsR0FBRyxFQUFFLENBQUM7QUFDVCxvQkFBRyxHQUFHLEVBQUUsQ0FBQztBQUNULG9CQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ1Qsb0JBQUcsR0FBRyxFQUFFLENBQUM7QUFDVCxtQkFBRSxHQUFHLEVBQUUsQ0FBQztBQUNSLG1CQUFFLEdBQUcsRUFBRSxDQUFDIn0=