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
import { TextureFilter, TextureWrap, TextureRegion } from "./Texture";
import { Utils } from "./Utils";
export class TextureAtlas {
    constructor(atlasText) {
        this.pages = new Array();
        this.regions = new Array();
        let reader = new TextureAtlasReader(atlasText);
        let entry = new Array(4);
        let pageFields = {};
        pageFields["size"] = (page) => {
            page.width = parseInt(entry[1]);
            page.height = parseInt(entry[2]);
        };
        pageFields["format"] = () => {
            // page.format = Format[tuple[0]]; we don't need format in WebGL
        };
        pageFields["filter"] = (page) => {
            page.minFilter = Utils.enumValue(TextureFilter, entry[1]);
            page.magFilter = Utils.enumValue(TextureFilter, entry[2]);
        };
        pageFields["repeat"] = (page) => {
            if (entry[1].indexOf('x') != -1)
                page.uWrap = TextureWrap.Repeat;
            if (entry[1].indexOf('y') != -1)
                page.vWrap = TextureWrap.Repeat;
        };
        pageFields["pma"] = (page) => {
            page.pma = entry[1] == "true";
        };
        var regionFields = {};
        regionFields["xy"] = (region) => {
            region.x = parseInt(entry[1]);
            region.y = parseInt(entry[2]);
        };
        regionFields["size"] = (region) => {
            region.width = parseInt(entry[1]);
            region.height = parseInt(entry[2]);
        };
        regionFields["bounds"] = (region) => {
            region.x = parseInt(entry[1]);
            region.y = parseInt(entry[2]);
            region.width = parseInt(entry[3]);
            region.height = parseInt(entry[4]);
        };
        regionFields["offset"] = (region) => {
            region.offsetX = parseInt(entry[1]);
            region.offsetY = parseInt(entry[2]);
        };
        regionFields["orig"] = (region) => {
            region.originalWidth = parseInt(entry[1]);
            region.originalHeight = parseInt(entry[2]);
        };
        regionFields["offsets"] = (region) => {
            region.offsetX = parseInt(entry[1]);
            region.offsetY = parseInt(entry[2]);
            region.originalWidth = parseInt(entry[3]);
            region.originalHeight = parseInt(entry[4]);
        };
        regionFields["rotate"] = (region) => {
            let value = entry[1];
            if (value == "true")
                region.degrees = 90;
            else if (value != "false")
                region.degrees = parseInt(value);
        };
        regionFields["index"] = (region) => {
            region.index = parseInt(entry[1]);
        };
        let line = reader.readLine();
        // Ignore empty lines before first entry.
        while (line && line.trim().length == 0)
            line = reader.readLine();
        // Header entries.
        while (true) {
            if (!line || line.trim().length == 0)
                break;
            if (reader.readEntry(entry, line) == 0)
                break; // Silently ignore all header fields.
            line = reader.readLine();
        }
        // Page and region entries.
        let page = null;
        let names = null;
        let values = null;
        while (true) {
            if (line === null)
                break;
            if (line.trim().length == 0) {
                page = null;
                line = reader.readLine();
            }
            else if (!page) {
                page = new TextureAtlasPage(line.trim());
                while (true) {
                    if (reader.readEntry(entry, line = reader.readLine()) == 0)
                        break;
                    let field = pageFields[entry[0]];
                    if (field)
                        field(page);
                }
                this.pages.push(page);
            }
            else {
                let region = new TextureAtlasRegion(page, line);
                while (true) {
                    let count = reader.readEntry(entry, line = reader.readLine());
                    if (count == 0)
                        break;
                    let field = regionFields[entry[0]];
                    if (field)
                        field(region);
                    else {
                        if (!names)
                            names = [];
                        if (!values)
                            values = [];
                        names.push(entry[0]);
                        let entryValues = [];
                        for (let i = 0; i < count; i++)
                            entryValues.push(parseInt(entry[i + 1]));
                        values.push(entryValues);
                    }
                }
                if (region.originalWidth == 0 && region.originalHeight == 0) {
                    region.originalWidth = region.width;
                    region.originalHeight = region.height;
                }
                if (names && names.length > 0 && values && values.length > 0) {
                    region.names = names;
                    region.values = values;
                    names = null;
                    values = null;
                }
                region.u = region.x / page.width;
                region.v = region.y / page.height;
                if (region.degrees == 90) {
                    region.u2 = (region.x + region.height) / page.width;
                    region.v2 = (region.y + region.width) / page.height;
                }
                else {
                    region.u2 = (region.x + region.width) / page.width;
                    region.v2 = (region.y + region.height) / page.height;
                }
                this.regions.push(region);
            }
        }
    }
    findRegion(name) {
        for (let i = 0; i < this.regions.length; i++) {
            if (this.regions[i].name == name) {
                return this.regions[i];
            }
        }
        return null;
    }
    setTextures(assetManager, pathPrefix = "") {
        for (let page of this.pages)
            page.setTexture(assetManager.get(pathPrefix + page.name));
    }
    dispose() {
        var _a;
        for (let i = 0; i < this.pages.length; i++) {
            (_a = this.pages[i].texture) === null || _a === void 0 ? void 0 : _a.dispose();
        }
    }
}
class TextureAtlasReader {
    constructor(text) {
        this.index = 0;
        this.lines = text.split(/\r\n|\r|\n/);
    }
    readLine() {
        if (this.index >= this.lines.length)
            return null;
        return this.lines[this.index++];
    }
    readEntry(entry, line) {
        if (!line)
            return 0;
        line = line.trim();
        if (line.length == 0)
            return 0;
        let colon = line.indexOf(':');
        if (colon == -1)
            return 0;
        entry[0] = line.substr(0, colon).trim();
        for (let i = 1, lastMatch = colon + 1;; i++) {
            let comma = line.indexOf(',', lastMatch);
            if (comma == -1) {
                entry[i] = line.substr(lastMatch).trim();
                return i;
            }
            entry[i] = line.substr(lastMatch, comma - lastMatch).trim();
            lastMatch = comma + 1;
            if (i == 4)
                return 4;
        }
    }
}
export class TextureAtlasPage {
    constructor(name) {
        this.minFilter = TextureFilter.Nearest;
        this.magFilter = TextureFilter.Nearest;
        this.uWrap = TextureWrap.ClampToEdge;
        this.vWrap = TextureWrap.ClampToEdge;
        this.texture = null;
        this.width = 0;
        this.height = 0;
        this.pma = false;
        this.regions = new Array();
        this.name = name;
    }
    setTexture(texture) {
        this.texture = texture;
        texture.setFilters(this.minFilter, this.magFilter);
        texture.setWraps(this.uWrap, this.vWrap);
        for (let region of this.regions)
            region.texture = texture;
    }
}
export class TextureAtlasRegion extends TextureRegion {
    constructor(page, name) {
        super();
        this.x = 0;
        this.y = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.index = 0;
        this.degrees = 0;
        this.names = null;
        this.values = null;
        this.page = page;
        this.name = name;
        page.regions.push(this);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGV4dHVyZUF0bGFzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1RleHR1cmVBdGxhcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFHL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQVcsYUFBYSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBQy9FLE9BQU8sRUFBYyxLQUFLLEVBQWEsTUFBTSxTQUFTLENBQUM7QUFFdkQsTUFBTSxPQUFPLFlBQVk7SUFJeEIsWUFBYSxTQUFpQjtRQUg5QixVQUFLLEdBQUcsSUFBSSxLQUFLLEVBQW9CLENBQUM7UUFDdEMsWUFBTyxHQUFHLElBQUksS0FBSyxFQUFzQixDQUFDO1FBR3pDLElBQUksTUFBTSxHQUFHLElBQUksa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0MsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQVMsQ0FBQyxDQUFDLENBQUM7UUFFakMsSUFBSSxVQUFVLEdBQWdELEVBQUUsQ0FBQztRQUNqRSxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFzQixFQUFFLEVBQUU7WUFDL0MsSUFBSyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDO1FBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsRUFBRTtZQUMzQixnRUFBZ0U7UUFDakUsQ0FBQyxDQUFDO1FBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBc0IsRUFBRSxFQUFFO1lBQ2pELElBQUssQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0QsSUFBSyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUM7UUFDRixVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFzQixFQUFFLEVBQUU7WUFDakQsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBRSxJQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7WUFDbEUsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFBRSxJQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFDbkUsQ0FBQyxDQUFDO1FBQ0YsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBc0IsRUFBRSxFQUFFO1lBQzlDLElBQUssQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQztRQUNoQyxDQUFDLENBQUM7UUFFRixJQUFJLFlBQVksR0FBb0QsRUFBRSxDQUFDO1FBQ3ZFLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQTBCLEVBQUUsRUFBRTtZQUNuRCxNQUFNLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUM7UUFDRixZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUEwQixFQUFFLEVBQUU7WUFDckQsTUFBTSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDO1FBQ0YsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBMEIsRUFBRSxFQUFFO1lBQ3ZELE1BQU0sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQztRQUNGLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQTBCLEVBQUUsRUFBRTtZQUN2RCxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQyxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUM7UUFDRixZQUFZLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUEwQixFQUFFLEVBQUU7WUFDckQsTUFBTSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUMsTUFBTSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDO1FBQ0YsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBMEIsRUFBRSxFQUFFO1lBQ3hELE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFD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