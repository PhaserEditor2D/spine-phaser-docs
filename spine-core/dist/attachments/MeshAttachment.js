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
import { TextureAtlasRegion } from "../TextureAtlas";
import { Color, Utils } from "../Utils";
import { VertexAttachment } from "./Attachment";
/** An attachment that displays a textured mesh. A mesh has hull vertices and internal vertices within the hull. Holes are not
 * supported. Each vertex has UVs (texture coordinates) and triangles are used to map an image on to the mesh.
 *
 * See [Mesh attachments](http://esotericsoftware.com/spine-meshes) in the Spine User Guide. */
export class MeshAttachment extends VertexAttachment {
    constructor(name, path) {
        super(name);
        this.region = null;
        /** The UV pair for each vertex, normalized within the texture region. */
        this.regionUVs = [];
        /** The UV pair for each vertex, normalized within the entire texture.
         *
         * See {@link #updateUVs}. */
        this.uvs = [];
        /** Triplets of vertex indices which describe the mesh's triangulation. */
        this.triangles = [];
        /** The color to tint the mesh. */
        this.color = new Color(1, 1, 1, 1);
        /** The width of the mesh's image. Available only when nonessential data was exported. */
        this.width = 0;
        /** The height of the mesh's image. Available only when nonessential data was exported. */
        this.height = 0;
        /** The number of entries at the beginning of {@link #vertices} that make up the mesh hull. */
        this.hullLength = 0;
        /** Vertex index pairs describing edges for controling triangulation. Mesh triangles will never cross edges. Only available if
         * nonessential data was exported. Triangulation is not performed at runtime. */
        this.edges = [];
        this.parentMesh = null;
        this.sequence = null;
        this.tempColor = new Color(0, 0, 0, 0);
        this.path = path;
    }
    /** Calculates {@link #uvs} using the {@link #regionUVs} and region. Must be called if the region, the region's properties, or
     * the {@link #regionUVs} are changed. */
    updateRegion() {
        if (!this.region)
            throw new Error("Region not set.");
        let regionUVs = this.regionUVs;
        if (!this.uvs || this.uvs.length != regionUVs.length)
            this.uvs = Utils.newFloatArray(regionUVs.length);
        let uvs = this.uvs;
        let n = this.uvs.length;
        let u = this.region.u, v = this.region.v, width = 0, height = 0;
        if (this.region instanceof TextureAtlasRegion) {
            let region = this.region, image = region.page.texture.getImage();
            let textureWidth = image.width, textureHeight = image.height;
            switch (region.degrees) {
                case 90:
                    u -= (region.originalHeight - region.offsetY - region.height) / textureWidth;
                    v -= (region.originalWidth - region.offsetX - region.width) / textureHeight;
                    width = region.originalHeight / textureWidth;
                    height = region.originalWidth / textureHeight;
                    for (let i = 0; i < n; i += 2) {
                        uvs[i] = u + regionUVs[i + 1] * width;
                        uvs[i + 1] = v + (1 - regionUVs[i]) * height;
                    }
                    return;
                case 180:
                    u -= (region.originalWidth - region.offsetX - region.width) / textureWidth;
                    v -= region.offsetY / textureHeight;
                    width = region.originalWidth / textureWidth;
                    height = region.originalHeight / textureHeight;
                    for (let i = 0; i < n; i += 2) {
                        uvs[i] = u + (1 - regionUVs[i]) * width;
                        uvs[i + 1] = v + (1 - regionUVs[i + 1]) * height;
                    }
                    return;
                case 270:
                    u -= region.offsetY / textureWidth;
                    v -= region.offsetX / textureHeight;
                    width = region.originalHeight / textureWidth;
                    height = region.originalWidth / textureHeight;
                    for (let i = 0; i < n; i += 2) {
                        uvs[i] = u + (1 - regionUVs[i + 1]) * width;
                        uvs[i + 1] = v + regionUVs[i] * height;
                    }
                    return;
            }
            u -= region.offsetX / textureWidth;
            v -= (region.originalHeight - region.offsetY - region.height) / textureHeight;
            width = region.originalWidth / textureWidth;
            height = region.originalHeight / textureHeight;
        }
        else if (!this.region) {
            u = v = 0;
            width = height = 1;
        }
        else {
            width = this.region.u2 - u;
            height = this.region.v2 - v;
        }
        for (let i = 0; i < n; i += 2) {
            uvs[i] = u + regionUVs[i] * width;
            uvs[i + 1] = v + regionUVs[i + 1] * height;
        }
    }
    /** The parent mesh if this is a linked mesh, else null. A linked mesh shares the {@link #bones}, {@link #vertices},
     * {@link #regionUVs}, {@link #triangles}, {@link #hullLength}, {@link #edges}, {@link #width}, and {@link #height} with the
     * parent mesh, but may have a different {@link #name} or {@link #path} (and therefore a different texture). */
    getParentMesh() {
        return this.parentMesh;
    }
    /** @param parentMesh May be null. */
    setParentMesh(parentMesh) {
        this.parentMesh = parentMesh;
        if (parentMesh) {
            this.bones = parentMesh.bones;
            this.vertices = parentMesh.vertices;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
            this.regionUVs = parentMesh.regionUVs;
            this.triangles = parentMesh.triangles;
            this.hullLength = parentMesh.hullLength;
            this.worldVerticesLength = parentMesh.worldVerticesLength;
        }
    }
    copy() {
        if (this.parentMesh)
            return this.newLinkedMesh();
        let copy = new MeshAttachment(this.name, this.path);
        copy.region = this.region;
        copy.color.setFromColor(this.color);
        this.copyTo(copy);
        copy.regionUVs = new Array(this.regionUVs.length);
        Utils.arrayCopy(this.regionUVs, 0, copy.regionUVs, 0, this.regionUVs.length);
        copy.uvs = new Array(this.uvs.length);
        Utils.arrayCopy(this.uvs, 0, copy.uvs, 0, this.uvs.length);
        copy.triangles = new Array(this.triangles.length);
        Utils.arrayCopy(this.triangles, 0, copy.triangles, 0, this.triangles.length);
        copy.hullLength = this.hullLength;
        copy.sequence = this.sequence != null ? this.sequence.copy() : null;
        // Nonessential.
        if (this.edges) {
            copy.edges = new Array(this.edges.length);
            Utils.arrayCopy(this.edges, 0, copy.edges, 0, this.edges.length);
        }
        copy.width = this.width;
        copy.height = this.height;
        return copy;
    }
    computeWorldVertices(slot, start, count, worldVertices, offset, stride) {
        if (this.sequence != null)
            this.sequence.apply(slot, this);
        super.computeWorldVertices(slot, start, count, worldVertices, offset, stride);
    }
    /** Returns a new mesh with the {@link #parentMesh} set to this mesh's parent mesh, if any, else to this mesh. **/
    newLinkedMesh() {
        let copy = new MeshAttachment(this.name, this.path);
        copy.region = this.region;
        copy.color.setFromColor(this.color);
        copy.timelineAttachment = this.timelineAttachment;
        copy.setParentMesh(this.parentMesh ? this.parentMesh : this);
        if (copy.region != null)
            copy.updateRegion();
        return copy;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWVzaEF0dGFjaG1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYXR0YWNobWVudHMvTWVzaEF0dGFjaG1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQW1CLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQWMsTUFBTSxjQUFjLENBQUM7QUFLNUQ7OzsrRkFHK0Y7QUFDL0YsTUFBTSxPQUFPLGNBQWUsU0FBUSxnQkFBZ0I7SUF1Q25ELFlBQWEsSUFBWSxFQUFFLElBQVk7UUFDdEMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBdkNiLFdBQU0sR0FBeUIsSUFBSSxDQUFDO1FBS3BDLHlFQUF5RTtRQUN6RSxjQUFTLEdBQW9CLEVBQUUsQ0FBQztRQUVoQzs7cUNBRTZCO1FBQzdCLFFBQUcsR0FBb0IsRUFBRSxDQUFDO1FBRTFCLDBFQUEwRTtRQUMxRSxjQUFTLEdBQWtCLEVBQUUsQ0FBQztRQUU5QixrQ0FBa0M7UUFDbEMsVUFBSyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTlCLHlGQUF5RjtRQUN6RixVQUFLLEdBQVcsQ0FBQyxDQUFDO1FBRWxCLDBGQUEwRjtRQUMxRixXQUFNLEdBQVcsQ0FBQyxDQUFDO1FBRW5CLDhGQUE4RjtRQUM5RixlQUFVLEdBQVcsQ0FBQyxDQUFDO1FBRXZCO3dGQUNnRjtRQUNoRixVQUFLLEdBQWtCLEVBQUUsQ0FBQztRQUVsQixlQUFVLEdBQTBCLElBQUksQ0FBQztRQUVqRCxhQUFRLEdBQW9CLElBQUksQ0FBQztRQUVqQyxjQUFTLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FB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