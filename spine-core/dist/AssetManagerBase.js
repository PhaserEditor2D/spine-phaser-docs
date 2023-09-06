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
import { TextureAtlas } from "./TextureAtlas";
export class AssetManagerBase {
    constructor(textureLoader, pathPrefix = "", downloader = new Downloader()) {
        this.pathPrefix = "";
        this.assets = {};
        this.errors = {};
        this.toLoad = 0;
        this.loaded = 0;
        this.textureLoader = textureLoader;
        this.pathPrefix = pathPrefix;
        this.downloader = downloader;
    }
    start(path) {
        this.toLoad++;
        return this.pathPrefix + path;
    }
    success(callback, path, asset) {
        this.toLoad--;
        this.loaded++;
        this.assets[path] = asset;
        if (callback)
            callback(path, asset);
    }
    error(callback, path, message) {
        this.toLoad--;
        this.loaded++;
        this.errors[path] = message;
        if (callback)
            callback(path, message);
    }
    loadAll() {
        let promise = new Promise((resolve, reject) => {
            let check = () => {
                if (this.isLoadingComplete()) {
                    if (this.hasErrors())
                        reject(this.errors);
                    else
                        resolve(this);
                    return;
                }
                requestAnimationFrame(check);
            };
            requestAnimationFrame(check);
        });
        return promise;
    }
    setRawDataURI(path, data) {
        this.downloader.rawDataUris[this.pathPrefix + path] = data;
    }
    loadBinary(path, success = () => { }, error = () => { }) {
        path = this.start(path);
        this.downloader.downloadBinary(path, (data) => {
            this.success(success, path, data);
        }, (status, responseText) => {
            this.error(error, path, `Couldn't load binary ${path}: status ${status}, ${responseText}`);
        });
    }
    loadText(path, success = () => { }, error = () => { }) {
        path = this.start(path);
        this.downloader.downloadText(path, (data) => {
            this.success(success, path, data);
        }, (status, responseText) => {
            this.error(error, path, `Couldn't load text ${path}: status ${status}, ${responseText}`);
        });
    }
    loadJson(path, success = () => { }, error = () => { }) {
        path = this.start(path);
        this.downloader.downloadJson(path, (data) => {
            this.success(success, path, data);
        }, (status, responseText) => {
            this.error(error, path, `Couldn't load JSON ${path}: status ${status}, ${responseText}`);
        });
    }
    loadTexture(path, success = () => { }, error = () => { }) {
        path = this.start(path);
        let isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document);
        let isWebWorker = !isBrowser; // && typeof importScripts !== 'undefined';
        if (isWebWorker) {
            fetch(path, { mode: "cors" }).then((response) => {
                if (response.ok)
                    return response.blob();
                this.error(error, path, `Couldn't load image: ${path}`);
                return null;
            }).then((blob) => {
                return blob ? createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" }) : null;
            }).then((bitmap) => {
                if (bitmap)
                    this.success(success, path, this.textureLoader(bitmap));
            });
        }
        else {
            let image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                this.success(success, path, this.textureLoader(image));
            };
            image.onerror = () => {
                this.error(error, path, `Couldn't load image: ${path}`);
            };
            if (this.downloader.rawDataUris[path])
                path = this.downloader.rawDataUris[path];
            image.src = path;
        }
    }
    loadTextureAtlas(path, success = () => { }, error = () => { }, fileAlias) {
        let index = path.lastIndexOf("/");
        let parent = index >= 0 ? path.substring(0, index + 1) : "";
        path = this.start(path);
        this.downloader.downloadText(path, (atlasText) => {
            try {
                let atlas = new TextureAtlas(atlasText);
                let toLoad = atlas.pages.length, abort = false;
                for (let page of atlas.pages) {
                    this.loadTexture(!fileAlias ? parent + page.name : fileAlias[page.name], (imagePath, texture) => {
                        if (!abort) {
                            page.setTexture(texture);
                            if (--toLoad == 0)
                                this.success(success, path, atlas);
                        }
                    }, (imagePath, message) => {
                        if (!abort)
                            this.error(error, path, `Couldn't load texture atlas ${path} page image: ${imagePath}`);
                        abort = true;
                    });
                }
            }
            catch (e) {
                this.error(error, path, `Couldn't parse texture atlas ${path}: ${e.message}`);
            }
        }, (status, responseText) => {
            this.error(error, path, `Couldn't load texture atlas ${path}: status ${status}, ${responseText}`);
        });
    }
    get(path) {
        return this.assets[this.pathPrefix + path];
    }
    require(path) {
        path = this.pathPrefix + path;
        let asset = this.assets[path];
        if (asset)
            return asset;
        let error = this.errors[path];
        throw Error("Asset not found: " + path + (error ? "\n" + error : ""));
    }
    remove(path) {
        path = this.pathPrefix + path;
        let asset = this.assets[path];
        if (asset.dispose)
            asset.dispose();
        delete this.assets[path];
        return asset;
    }
    removeAll() {
        for (let key in this.assets) {
            let asset = this.assets[key];
            if (asset.dispose)
                asset.dispose();
        }
        this.assets = {};
    }
    isLoadingComplete() {
        return this.toLoad == 0;
    }
    getToLoad() {
        return this.toLoad;
    }
    getLoaded() {
        return this.loaded;
    }
    dispose() {
        this.removeAll();
    }
    hasErrors() {
        return Object.keys(this.errors).length > 0;
    }
    getErrors() {
        return this.errors;
    }
}
export class Downloader {
    constructor() {
        this.callbacks = {};
        this.rawDataUris = {};
    }
    dataUriToString(dataUri) {
        if (!dataUri.startsWith("data:")) {
            throw new Error("Not a data URI.");
        }
        let base64Idx = dataUri.indexOf("base64,");
        if (base64Idx != -1) {
            base64Idx += "base64,".length;
            return atob(dataUri.substr(base64Idx));
        }
        else {
            return dataUri.substr(dataUri.indexOf(",") + 1);
        }
    }
    base64ToUint8Array(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    }
    dataUriToUint8Array(dataUri) {
        if (!dataUri.startsWith("data:")) {
            throw new Error("Not a data URI.");
        }
        let base64Idx = dataUri.indexOf("base64,");
        if (base64Idx == -1)
            throw new Error("Not a binary data URI.");
        base64Idx += "base64,".length;
        return this.base64ToUint8Array(dataUri.substr(base64Idx));
    }
    downloadText(url, success, error) {
        if (this.start(url, success, error))
            return;
        if (this.rawDataUris[url]) {
            try {
                let dataUri = this.rawDataUris[url];
                this.finish(url, 200, this.dataUriToString(dataUri));
            }
            catch (e) {
                this.finish(url, 400, JSON.stringify(e));
            }
            return;
        }
        let request = new XMLHttpRequest();
        request.overrideMimeType("text/html");
        request.open("GET", url, true);
        let done = () => {
            this.finish(url, request.status, request.responseText);
        };
        request.onload = done;
        request.onerror = done;
        request.send();
    }
    downloadJson(url, success, error) {
        this.downloadText(url, (data) => {
            success(JSON.parse(data));
        }, error);
    }
    downloadBinary(url, success, error) {
        if (this.start(url, success, error))
            return;
        if (this.rawDataUris[url]) {
            try {
                let dataUri = this.rawDataUris[url];
                this.finish(url, 200, this.dataUriToUint8Array(dataUri));
            }
            catch (e) {
                this.finish(url, 400, JSON.stringify(e));
            }
            return;
        }
        let request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        let onerror = () => {
            this.finish(url, request.status, request.response);
        };
        request.onload = () => {
            if (request.status == 200 || request.status == 0)
                this.finish(url, 200, new Uint8Array(request.response));
            else
                onerror();
        };
        request.onerror = onerror;
        request.send();
    }
    start(url, success, error) {
        let callbacks = this.callbacks[url];
        try {
            if (callbacks)
                return true;
            this.callbacks[url] = callbacks = [];
        }
        finally {
            callbacks.push(success, error);
        }
    }
    finish(url, status, data) {
        let callbacks = this.callbacks[url];
        delete this.callbacks[url];
        let args = status == 200 || status == 0 ? [data] : [status, data];
        for (let i = args.length - 1, n = callbacks.length; i < n; i += 2)
            callbacks[i].apply(null, args);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXNzZXRNYW5hZ2VyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9Bc3NldE1hbmFnZXJCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7K0VBMkIrRTtBQUcvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFHOUMsTUFBTSxPQUFPLGdCQUFnQjtJQVM1QixZQUFhLGFBQWlFLEVBQUUsYUFBcUIsRUFBRSxFQUFFLGFBQXlCLElBQUksVUFBVSxFQUFFO1FBUjFJLGVBQVUsR0FBVyxFQUFFLENBQUM7UUFHeEIsV0FBTSxHQUFtQixFQUFFLENBQUM7UUFDNUIsV0FBTSxHQUFzQixFQUFFLENBQUM7UUFDL0IsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFHbEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDOUIsQ0FBQztJQUVPLEtBQUssQ0FBRSxJQUFZO1FBQzFCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVPLE9BQU8sQ0FBRSxRQUEyQyxFQUFFLElBQVksRUFBRSxLQUFVO1FBQ3JGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBQzFCLElBQUksUUFBUTtZQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVPLEtBQUssQ0FBRSxRQUFpRCxFQUFFLElBQVksRUFBRSxPQUFlO1FB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