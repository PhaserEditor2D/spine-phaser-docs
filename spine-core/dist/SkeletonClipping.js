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
import { Triangulator } from "./Triangulator";
import { Utils } from "./Utils";
export class SkeletonClipping {
    constructor() {
        this.triangulator = new Triangulator();
        this.clippingPolygon = new Array();
        this.clipOutput = new Array();
        this.clippedVertices = new Array();
        this.clippedTriangles = new Array();
        this.scratch = new Array();
        this.clipAttachment = null;
        this.clippingPolygons = null;
    }
    clipStart(slot, clip) {
        if (this.clipAttachment)
            return 0;
        this.clipAttachment = clip;
        let n = clip.worldVerticesLength;
        let vertices = Utils.setArraySize(this.clippingPolygon, n);
        clip.computeWorldVertices(slot, 0, n, vertices, 0, 2);
        let clippingPolygon = this.clippingPolygon;
        SkeletonClipping.makeClockwise(clippingPolygon);
        let clippingPolygons = this.clippingPolygons = this.triangulator.decompose(clippingPolygon, this.triangulator.triangulate(clippingPolygon));
        for (let i = 0, n = clippingPolygons.length; i < n; i++) {
            let polygon = clippingPolygons[i];
            SkeletonClipping.makeClockwise(polygon);
            polygon.push(polygon[0]);
            polygon.push(polygon[1]);
        }
        return clippingPolygons.length;
    }
    clipEndWithSlot(slot) {
        if (this.clipAttachment && this.clipAttachment.endSlot == slot.data)
            this.clipEnd();
    }
    clipEnd() {
        if (!this.clipAttachment)
            return;
        this.clipAttachment = null;
        this.clippingPolygons = null;
        this.clippedVertices.length = 0;
        this.clippedTriangles.length = 0;
        this.clippingPolygon.length = 0;
    }
    isClipping() {
        return this.clipAttachment != null;
    }
    clipTriangles(vertices, verticesLength, triangles, trianglesLength, uvs, light, dark, twoColor) {
        let clipOutput = this.clipOutput, clippedVertices = this.clippedVertices;
        let clippedTriangles = this.clippedTriangles;
        let polygons = this.clippingPolygons;
        let polygonsCount = polygons.length;
        let vertexSize = twoColor ? 12 : 8;
        let index = 0;
        clippedVertices.length = 0;
        clippedTriangles.length = 0;
        outer: for (let i = 0; i < trianglesLength; i += 3) {
            let vertexOffset = triangles[i] << 1;
            let x1 = vertices[vertexOffset], y1 = vertices[vertexOffset + 1];
            let u1 = uvs[vertexOffset], v1 = uvs[vertexOffset + 1];
            vertexOffset = triangles[i + 1] << 1;
            let x2 = vertices[vertexOffset], y2 = vertices[vertexOffset + 1];
            let u2 = uvs[vertexOffset], v2 = uvs[vertexOffset + 1];
            vertexOffset = triangles[i + 2] << 1;
            let x3 = vertices[vertexOffset], y3 = vertices[vertexOffset + 1];
            let u3 = uvs[vertexOffset], v3 = uvs[vertexOffset + 1];
            for (let p = 0; p < polygonsCount; p++) {
                let s = clippedVertices.length;
                if (this.clip(x1, y1, x2, y2, x3, y3, polygons[p], clipOutput)) {
                    let clipOutputLength = clipOutput.length;
                    if (clipOutputLength == 0)
                        continue;
                    let d0 = y2 - y3, d1 = x3 - x2, d2 = x1 - x3, d4 = y3 - y1;
                    let d = 1 / (d0 * d2 + d1 * (y1 - y3));
                    let clipOutputCount = clipOutputLength >> 1;
                    let clipOutputItems = this.clipOutput;
                    let clippedVerticesItems = Utils.setArraySize(clippedVertices, s + clipOutputCount * vertexSize);
                    for (let ii = 0; ii < clipOutputLength; ii += 2) {
                        let x = clipOutputItems[ii], y = clipOutputItems[ii + 1];
                        clippedVerticesItems[s] = x;
                        clippedVerticesItems[s + 1] = y;
                        clippedVerticesItems[s + 2] = light.r;
                        clippedVerticesItems[s + 3] = light.g;
                        clippedVerticesItems[s + 4] = light.b;
                        clippedVerticesItems[s + 5] = light.a;
                        let c0 = x - x3, c1 = y - y3;
                        let a = (d0 * c0 + d1 * c1) * d;
                        let b = (d4 * c0 + d2 * c1) * d;
                        let c = 1 - a - b;
                        clippedVerticesItems[s + 6] = u1 * a + u2 * b + u3 * c;
                        clippedVerticesItems[s + 7] = v1 * a + v2 * b + v3 * c;
                        if (twoColor) {
                            clippedVerticesItems[s + 8] = dark.r;
                            clippedVerticesItems[s + 9] = dark.g;
                            clippedVerticesItems[s + 10] = dark.b;
                            clippedVerticesItems[s + 11] = dark.a;
                        }
                        s += vertexSize;
                    }
                    s = clippedTriangles.length;
                    let clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3 * (clipOutputCount - 2));
                    clipOutputCount--;
                    for (let ii = 1; ii < clipOutputCount; ii++) {
                        clippedTrianglesItems[s] = index;
                        clippedTrianglesItems[s + 1] = (index + ii);
                        clippedTrianglesItems[s + 2] = (index + ii + 1);
                        s += 3;
                    }
                    index += clipOutputCount + 1;
                }
                else {
                    let clippedVerticesItems = Utils.setArraySize(clippedVertices, s + 3 * vertexSize);
                    clippedVerticesItems[s] = x1;
                    clippedVerticesItems[s + 1] = y1;
                    clippedVerticesItems[s + 2] = light.r;
                    clippedVerticesItems[s + 3] = light.g;
                    clippedVerticesItems[s + 4] = light.b;
                    clippedVerticesItems[s + 5] = light.a;
                    if (!twoColor) {
                        clippedVerticesItems[s + 6] = u1;
                        clippedVerticesItems[s + 7] = v1;
                        clippedVerticesItems[s + 8] = x2;
                        clippedVerticesItems[s + 9] = y2;
                        clippedVerticesItems[s + 10] = light.r;
                        clippedVerticesItems[s + 11] = light.g;
                        clippedVerticesItems[s + 12] = light.b;
                        clippedVerticesItems[s + 13] = light.a;
                        clippedVerticesItems[s + 14] = u2;
                        clippedVerticesItems[s + 15] = v2;
                        clippedVerticesItems[s + 16] = x3;
                        clippedVerticesItems[s + 17] = y3;
                        clippedVerticesItems[s + 18] = light.r;
                        clippedVerticesItems[s + 19] = light.g;
                        clippedVerticesItems[s + 20] = light.b;
                        clippedVerticesItems[s + 21] = light.a;
                        clippedVerticesItems[s + 22] = u3;
                        clippedVerticesItems[s + 23] = v3;
                    }
                    else {
                        clippedVerticesItems[s + 6] = u1;
                        clippedVerticesItems[s + 7] = v1;
                        clippedVerticesItems[s + 8] = dark.r;
                        clippedVerticesItems[s + 9] = dark.g;
                        clippedVerticesItems[s + 10] = dark.b;
                        clippedVerticesItems[s + 11] = dark.a;
                        clippedVerticesItems[s + 12] = x2;
                        clippedVerticesItems[s + 13] = y2;
                        clippedVerticesItems[s + 14] = light.r;
                        clippedVerticesItems[s + 15] = light.g;
                        clippedVerticesItems[s + 16] = light.b;
                        clippedVerticesItems[s + 17] = light.a;
                        clippedVerticesItems[s + 18] = u2;
                        clippedVerticesItems[s + 19] = v2;
                        clippedVerticesItems[s + 20] = dark.r;
                        clippedVerticesItems[s + 21] = dark.g;
                        clippedVerticesItems[s + 22] = dark.b;
                        clippedVerticesItems[s + 23] = dark.a;
                        clippedVerticesItems[s + 24] = x3;
                        clippedVerticesItems[s + 25] = y3;
                        clippedVerticesItems[s + 26] = light.r;
                        clippedVerticesItems[s + 27] = light.g;
                        clippedVerticesItems[s + 28] = light.b;
                        clippedVerticesItems[s + 29] = light.a;
                        clippedVerticesItems[s + 30] = u3;
                        clippedVerticesItems[s + 31] = v3;
                        clippedVerticesItems[s + 32] = dark.r;
                        clippedVerticesItems[s + 33] = dark.g;
                        clippedVerticesItems[s + 34] = dark.b;
                        clippedVerticesItems[s + 35] = dark.a;
                    }
                    s = clippedTriangles.length;
                    let clippedTrianglesItems = Utils.setArraySize(clippedTriangles, s + 3);
                    clippedTrianglesItems[s] = index;
                    clippedTrianglesItems[s + 1] = (index + 1);
                    clippedTrianglesItems[s + 2] = (index + 2);
                    index += 3;
                    continue outer;
                }
            }
        }
    }
    /** Clips the input triangle against the convex, clockwise clipping area. If the triangle lies entirely within the clipping
     * area, false is returned. The clipping area must duplicate the first vertex at the end of the vertices list. */
    clip(x1, y1, x2, y2, x3, y3, clippingArea, output) {
        let originalOutput = output;
        let clipped = false;
        // Avoid copy at the end.
        let input;
        if (clippingArea.length % 4 >= 2) {
            input = output;
            output = this.scratch;
        }
        else
            input = this.scratch;
        input.length = 0;
        input.push(x1);
        input.push(y1);
        input.push(x2);
        input.push(y2);
        input.push(x3);
        input.push(y3);
        input.push(x1);
        input.push(y1);
        output.length = 0;
        let clippingVertices = clippingArea;
        let clippingVerticesLast = clippingArea.length - 4;
        for (let i = 0;; i += 2) {
            let edgeX = clippingVertices[i], edgeY = clippingVertices[i + 1];
            let edgeX2 = clippingVertices[i + 2], edgeY2 = clippingVertices[i + 3];
            let deltaX = edgeX - edgeX2, deltaY = edgeY - edgeY2;
            let inputVertices = input;
            let inputVerticesLength = input.length - 2, outputStart = output.length;
            for (let ii = 0; ii < inputVerticesLength; ii += 2) {
                let inputX = inputVertices[ii], inputY = inputVertices[ii + 1];
                let inputX2 = inputVertices[ii + 2], inputY2 = inputVertices[ii + 3];
                let side2 = deltaX * (inputY2 - edgeY2) - deltaY * (inputX2 - edgeX2) > 0;
                if (deltaX * (inputY - edgeY2) - deltaY * (inputX - edgeX2) > 0) {
                    if (side2) { // v1 inside, v2 inside
                        output.push(inputX2);
                        output.push(inputY2);
                        continue;
                    }
                    // v1 inside, v2 outside
                    let c0 = inputY2 - inputY, c2 = inputX2 - inputX;
                    let s = c0 * (edgeX2 - edgeX) - c2 * (edgeY2 - edgeY);
                    if (Math.abs(s) > 0.000001) {
                        let ua = (c2 * (edgeY - inputY) - c0 * (edgeX - inputX)) / s;
                        output.push(edgeX + (edgeX2 - edgeX) * ua);
                        output.push(edgeY + (edgeY2 - edgeY) * ua);
                    }
                    else {
                        output.push(edgeX);
                        output.push(edgeY);
                    }
                }
                else if (side2) { // v1 outside, v2 inside
                    let c0 = inputY2 - inputY, c2 = inputX2 - inputX;
                    let s = c0 * (edgeX2 - edgeX) - c2 * (edgeY2 - edgeY);
                    if (Math.abs(s) > 0.000001) {
                        let ua = (c2 * (edgeY - inputY) - c0 * (edgeX - inputX)) / s;
                        output.push(edgeX + (edgeX2 - edgeX) * ua);
                        output.push(edgeY + (edgeY2 - edgeY) * ua);
                    }
                    else {
                        output.push(edgeX);
                        output.push(edgeY);
                    }
                    output.push(inputX2);
                    output.push(inputY2);
                }
                clipped = true;
            }
            if (outputStart == output.length) { // All edges outside.
                originalOutput.length = 0;
                return true;
            }
            output.push(output[0]);
            output.push(output[1]);
            if (i == clippingVerticesLast)
                break;
            let temp = output;
            output = input;
            output.length = 0;
            input = temp;
        }
        if (originalOutput != output) {
            originalOutput.length = 0;
            for (let i = 0, n = output.length - 2; i < n; i++)
                originalOutput[i] = output[i];
        }
        else
            originalOutput.length = originalOutput.length - 2;
        return clipped;
    }
    static makeClockwise(polygon) {
        let vertices = polygon;
        let verticeslength = polygon.length;
        let area = vertices[verticeslength - 2] * vertices[1] - vertices[0] * vertices[verticeslength - 1], p1x = 0, p1y = 0, p2x = 0, p2y = 0;
        for (let i = 0, n = verticeslength - 3; i < n; i += 2) {
            p1x = vertices[i];
            p1y = vertices[i + 1];
            p2x = vertices[i + 2];
            p2y = vertices[i + 3];
            area += p1x * p2y - p2x * p1y;
        }
        if (area < 0)
            return;
        for (let i = 0, lastX = verticeslength - 2, n = verticeslength >> 1; i < n; i += 2) {
            let x = vertices[i], y = vertices[i + 1];
            let other = lastX - i;
            vertices[i] = vertices[other];
            vertices[i + 1] = vertices[other + 1];
            vertices[other] = x;
            vertices[other + 1] = y;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2tlbGV0b25DbGlwcGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Ta2VsZXRvbkNsaXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUkvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBMEIsTUFBTSxTQUFTLENBQUM7QUFFeEQsTUFBTSxPQUFPLGdCQUFnQjtJQUE3QjtRQUNTLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQyxvQkFBZSxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7UUFDdEMsZUFBVSxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7UUFDekMsb0JBQWUsR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFDO1FBQ3RDLHFCQUFnQixHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7UUFDL0IsWUFBTyxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7UUFFOUIsbUJBQWMsR0FBOEIsSUFBSSxDQUFDO1FBQ2pELHFCQUFnQixHQUFnQyxJQUFJLENBQUM7SUFrVDlELENBQUM7SUFoVEEsU0FBUyxDQUFFLElBQVUsRUFBRSxJQUF3QjtRQUM5QyxJQUFJLElBQUksQ0FBQyxjQUFjO1lBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFM0IsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDO1FBQ2pDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxJQUFJ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QW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDakMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFFakMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDakMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDakMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBRWxDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNsQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUNsQzt5QkFBTTt3QkFDTixvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNqQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNqQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDckMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUN0QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFFdEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDbEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDbEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7d0JBQ2xDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUN0QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQzt3QkFDdEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUV0QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNsQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO3dCQUNsQyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3ZDLG9CQUFvQixDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2QyxvQkFBb0IsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDbEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQzt3QkFDbEMsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLG9CQUFvQixDQUFD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