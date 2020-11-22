import { InsightBuilding, InsightError, InsightRoom, InsightTempRoom } from "./IInsightFacade";
import JSZip = require("jszip");

import chai = require("chai");
import chaiHttp = require("chai-http");

chai.use(chaiHttp);


let parse5 = require("parse5");

export default class RoomsController {
    private buildings: InsightBuilding[] = [];
    private buildingsMap: Map<string, InsightBuilding> = new Map<string, InsightBuilding>();
    private tempRooms: InsightTempRoom[] = [];

    public roomsFromZip(zip: JSZip): Promise<InsightRoom[]> {
        this.buildings = [];
        this.buildingsMap = new Map<string, InsightBuilding>();
        this.tempRooms = [];
        let rooms: InsightRoom[] = [];
        const files = Object.keys(zip.folder("rooms").files);

        return new Promise((resolve, reject) => {
            if (!(zip.folder("rooms") && zip.folder("rooms").file("index.htm"))) {
                reject("no rooms or no index.html");
            }
            zip.folder("rooms").file("index.htm").async("text").then(async (rawData) => {
                let document = parse5.parse(rawData);
                this.processNode(document, "index");
                this.buildings = await this.getGeolocations();
                this.setBuildingsMap();
                const promises: any[] = [];
                for (const href of this.buildings.map((b) => b.href)) {
                    if (files.indexOf(href) !== -1) {
                        promises.push(zip.folder("rooms").file(href.substr(6)).async("text").then((data) => {
                            this.processNode(parse5.parse(data), "building");
                        }));
                    }
                }
                Promise.all(promises).then(() => {
                    rooms = this.mergeData();
                    resolve(rooms);
                });
            });
        });
    }

    private mergeData(): InsightRoom[] {
        const rooms: InsightRoom[] = [];

        for (const r of this.tempRooms) {
            const split = r.href.split("/");
            const code = split[split.length - 1].split("-")[0];
            const building = this.buildingsMap.get(code);
            if (building) {
                rooms.push({
                    fullname: building.name,
                    shortname: building.code,
                    number: r.roomNumber,
                    name: building.code + "_" + r.roomNumber,
                    address: building.address,
                    lat: building.lat,
                    lon: building.lon,
                    seats: r.capacity,
                    type: r.type,
                    furniture: r.furniture,
                    href: r.href
                });
            }
        }
        return rooms;
    }

    private setBuildingsMap() {
        for (const b of this.buildings) {
            this.buildingsMap.set(b.code, b);
        }
    }

    private processNode(node: any, indexOrBuilingFile: "index" | "building") {
        if (indexOrBuilingFile === "index" && node.nodeName === "tr" && node.tagName === "tr") {
            this.processTrBuilding(node);
        }
        if (indexOrBuilingFile === "building" && node.nodeName === "tr" && node.tagName === "tr") {
            this.processTrRooms(node);
        }
        if (node.childNodes) {
            for (const n of node.childNodes) {
                this.processNode(n, indexOrBuilingFile);
            }
        }
    }

    private processTrBuilding(tr: any) {
        let code: string;
        let address: string;
        let href: string;
        let name: string;

        for (const cn of tr.childNodes) {
            if (cn.nodeName === "td" && cn.tagName === "td" && cn && cn.attrs && cn.attrs.length > 0) {
                for (const attr of cn.attrs) {
                    if (attr.value === "views-field views-field-title") {
                        const res = this.getHrefAndName(cn, "building");
                        href = res.href;
                        name = res.name;
                    }
                    if (attr.value === "views-field views-field-field-building-code") {
                        code = cn.childNodes[0].value.trim();
                    }
                    if (attr.value === "views-field views-field-field-building-address") {
                        address = cn.childNodes[0].value.trim();
                    }
                }
            }
        }
        this.setBulding(code, address, href, name);
    }

    private processTrRooms(tr: any) {
        let roomNumber: string;
        let capacity: number;
        let furniture: string;
        let type: string;
        let href: string;

        for (const cn of tr.childNodes) {
            if (cn.nodeName === "td" && cn.tagName === "td" && cn && cn.attrs && cn.attrs.length > 0) {
                for (const attr of cn.attrs) {
                    if (attr.value === "views-field views-field-field-room-number") {
                        const res = this.getHrefAndName(cn, "room");
                        href = res.href;
                        roomNumber = res.name;
                    }
                    if (attr.value === "views-field views-field-field-room-capacity") {
                        capacity = +cn.childNodes[0].value.trim();
                    }
                    if (attr.value === "views-field views-field-field-room-furniture") {
                        furniture = cn.childNodes[0].value.trim();
                    }
                    if (attr.value === "views-field views-field-field-room-type") {
                        type = cn.childNodes[0].value.trim();
                    }
                }
            }
        }
        this.setTempRoom(roomNumber, capacity, href, type, furniture);
    }

    private setTempRoom(roomNumber: string, capacity: number, href: string, type: string, furniture: string) {
        if (roomNumber && href
            && furniture !== undefined && furniture !== null
            && !isNaN(capacity) && capacity !== undefined && capacity !== null
            && type !== null && type !== undefined) {
            this.tempRooms.push({ roomNumber, capacity, href, type, furniture });
        }
    }

    private getHrefAndName(node: any, buildingOrRoom: "building" | "room"): { href: string, name: string } {
        let href: string;
        let name: string;
        for (node of node.childNodes) {
            if (node.nodeName === "a" && node.tagName === "a") {
                for (const attr of node.attrs) {
                    if (attr.name === "href" && buildingOrRoom === "building") {
                        href = "rooms" + attr.value.substr(1);
                        name = node.childNodes[0].value;
                    } else if (attr.name === "href" && buildingOrRoom === "room") {
                        href = attr.value;
                        name = node.childNodes[0].value;
                    }
                }
            }
        }
        return { href, name };
    }

    private setBulding(code: string, address: string, href: string, name: string) {
        if (code && address) {
            this.buildings.push({
                code,
                address,
                lat: null,
                lon: null,
                href,
                name
            });
        }
    }

    private getGeolocations(): Promise<InsightBuilding[]> {
        return new Promise((resolve) => {
            let promises: any[] = [];
            for (const b of this.buildings) {
                const base = "http://cs310.students.cs.ubc.ca:11316";
                const url = "/api/v1/project_team<115>/" + b.address;
                promises.push(chai.request(base).get(url));
            }

            Promise.all(promises).then((data) => {
                data.forEach((geoResponse, i) => {
                    if (!(geoResponse.body.error)) {
                        this.buildings[i].lat = geoResponse.body.lat;
                        this.buildings[i].lon = geoResponse.body.lon;
                    } else {
                        delete this.buildings[i];
                    }
                });
                resolve(this.buildings.filter((b) => b !== undefined));
            }).catch((e) => {
                throw new InsightError(e);
            });
        });
    }
}
