import { expect } from "chai";
import * as fs from "fs-extra";

import { InsightDatasetKind, InsightError, NotFoundError, InsightDataset } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        course_s: "./test/data/courses.zip",
        courses2: "./test/data/courses.zip",
        coursewithextension: "./test/data/course-with-extension.zip",
        coursewithgarbage: "./test/data/course-with-garbage.zip",
        courseswithbadfile: "./test/data/courses-with-bad-file.zip",
        emptycoursesfolder: "./test/data/empty-courses-folder.zip",
        emptyzip: "./test/data/empty-zip.zip",
        missingproperty: "./test/data/missing-property.zip",
        newproperty: "./test/data/new-property.zip",
        norank: "./test/data/no-rank.zip",
        noresult: "./test/data/no-result.zip",
        novalidcourses: "./test/data/no-valid-courses.zip",
        novalidsections: "./test/data/no-valid-sections.zip",
        notzip: "./test/data/notzip",
        notzipdotzip: "./test/data/notzip.zip",
        zipwithoutext: "./test/data/courses",
        wrongfoldername: "./test/data/wrong-folder-name.zip",
        wrongpropertytype: "./test/data/wrong-property-type.zip",
        wrongresulttype: "./test/data/wrong-result-type.zip",
        rooms: "./test/data/rooms.zip",
        rooms2: "./test/data/rooms.zip",
        roomfakebuilding: "./test/data/room-fake-building.zip",
        roomnobuilding: "./test/data/room-no-building.zip",
        roomnoindex: "./test/data/room-no-index.zip",
        roomwrongfoldername: "./test/data/room-wrong-folder-name.zip",
        roomwithextension: "./test/data/room-with-extension.zip"
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // ****************************************************************
    // ************************ ROOMS TESTS ***************************
    // ****************************************************************
    // Basic add / remove
    it("Add a valid dataset", async () => {
        const id: string = "rooms";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Remove a valid dataset after adding", async () => {
        const id: string = "rooms";
        let result: string;

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.removeDataset(id);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(id);
        }
    });

    it("Add 2 identical datasets", async () => {
        const id: string = "rooms";
        let result: string[];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add 2 different valid datasets", async () => {
        const id1: string = "rooms";
        const id2: string = "rooms2";
        let result: string[];

        await insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id1, id2]);
        }
    });

    it("Remove non existing dataset", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset("rescou");
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(NotFoundError);
        }
    });

    it("Add remove add valid", async () => {
        const id: string = "rooms";
        let result: string[];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        await insightFacade.removeDataset(id);

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Add dataset with invalid path", async () => {
        const id: string = "rooms";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, "path bad", InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Custom zips testing
    it("Rooms with extension", async () => {
        const id: string = "roomwithextension";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Empty zip", async () => {
        const id: string = "emptyzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Not a zip", async () => {
        const id: string = "notzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Not a zip with .zip extension", async () => {
        const id: string = "notzipdotzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Wrong folder name", async () => {
        const id: string = "roomwrongfoldername";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Invalid Dataset Kind
    it("Add dataset providing DatasetKind.Rooms", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Invalid id
    it("Add empty id", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset("   ", datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add id with whitespace", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset("id   asldkjfhjlkasdf", datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add id with _", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset("asdfl_ajsdfn", datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Null argument checking
    it("Add null id", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(null, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add null dataset", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, null, InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Undefined argument checking
    it("Add undefined id", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset(undefined, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add undefined dataset", async () => {
        const id: string = "rooms";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, undefined, InsightDatasetKind.Rooms);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Test listDatasets
    it("Test listDatasets by add a valid dataset", async () => {
        const id: string = "rooms";
        let result: InsightDataset[];
        const expected: InsightDataset[] = [
            {
                id: "rooms",
                kind: InsightDatasetKind.Rooms,
                numRows: 364
            }
        ];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.listDatasets();
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });

    it("Test listDatasets by add two valid datasets", async () => {
        const id: string = "rooms";
        let result: InsightDataset[];
        const expected: InsightDataset[] = [
            {
                id: "rooms",
                kind: InsightDatasetKind.Rooms,
                numRows: 364
            },
            {
                id: "rooms2",
                kind: InsightDatasetKind.Rooms,
                numRows: 364
            }
        ];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        await insightFacade.removeDataset(id);
        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        await insightFacade.addDataset("rooms2", datasets[id], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.listDatasets();
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });

    it("Test listDatasets by add two valid rooms datasets", async () => {
        const id: string = "rooms";
        let result: InsightDataset[];
        const expected: InsightDataset[] = [
            {
                id: "rooms",
                kind: InsightDatasetKind.Rooms,
                numRows: 364
            },
            {
                id: "rooms2",
                kind: InsightDatasetKind.Rooms,
                numRows: 364
            }
        ];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        await insightFacade.removeDataset(id);
        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        await insightFacade.addDataset("rooms2", datasets[id], InsightDatasetKind.Rooms);

        try {
            result = await insightFacade.listDatasets();
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });

    // ****************************************************************
    // ************************ COURSES TESTS ***************************
    // ****************************************************************
    // Basic add/remove
    it("Add a valid dataset", async () => {
        const id: string = "courses";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Remove a valid dataset after adding", async () => {
        const id: string = "courses";
        let result: string;

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);

        try {
            result = await insightFacade.removeDataset(id);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(id);
        }
    });

    it("Add 2 identical datasets", async () => {
        const id: string = "courses";
        let result: string[];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add 2 different valid datasets", async () => {
        const id1: string = "courses";
        const id2: string = "courses2";
        let result: string[];

        await insightFacade.addDataset(id1, datasets[id1], InsightDatasetKind.Courses);

        try {
            result = await insightFacade.addDataset(id2, datasets[id2], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id1, id2]);
        }
    });

    it("Remove non existing dataset", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset("rescou");
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(NotFoundError);
        }
    });

    it("Add remove add valid", async () => {
        const id: string = "courses";
        let result: string[];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        await insightFacade.removeDataset(id);

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Add dataset with invalid path", async () => {
        const id: string = "courses";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, "path bad", InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Custom zips testing
    it("Course with extension", async () => {
        const id: string = "coursewithextension";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Course with garbage", async () => {
        const id: string = "coursewithgarbage";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Course with bad file (jpeg)", async () => {
        const id: string = "courseswithbadfile";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Empty courses folder", async () => {
        const id: string = "emptycoursesfolder";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Empty zip", async () => {
        const id: string = "emptyzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Missing property", async () => {
        const id: string = "missingproperty";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("New property", async () => {
        const id: string = "newproperty";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("No rank", async () => {
        const id: string = "norank";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("No result", async () => {
        const id: string = "noresult";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("No valid courses", async () => {
        const id: string = "novalidcourses";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("No valid sections", async () => {
        const id: string = "novalidsections";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Not a zip", async () => {
        const id: string = "notzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Not a zip with .zip extension", async () => {
        const id: string = "notzipdotzip";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Wrong folder name", async () => {
        const id: string = "wrongfoldername";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Wrong property type", async () => {
        const id: string = "wrongpropertytype";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    it("Wrong result type", async () => {
        const id: string = "wrongresulttype";
        let result: string[];

        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal([id]);
        }
    });

    // Invalid id
    it("Add empty id", async () => {
        const id: string = "  ";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Remove empty id", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset("    ");
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add id with whitespace", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset("id   courses", datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Remove id with whitespace", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset("id   courses");
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add id with _", async () => {
        const id: string = "course_s";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Remove id with _", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset("rse_scou");
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Null argument checking
    it("Add null id", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(null, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add null dataset", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, null, InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add null dataset kind", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], null);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Remove null dataset", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset(null);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Undefined argument checking
    it("Add undefined id", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(undefined, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add undefined dataset", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, undefined, InsightDatasetKind.Courses);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Add undefined dataset kind", async () => {
        const id: string = "courses";
        let result: string[];
        try {
            result = await insightFacade.addDataset(id, datasets[id], undefined);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Remove undefined dataset", async () => {
        let result: string;
        try {
            result = await insightFacade.removeDataset(undefined);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    // Test listDatasets
    it("Test listDatasets by add a valid dataset", async () => {
        const id: string = "courses";
        let result: InsightDataset[];
        const expected: InsightDataset[] = [
            {
                id: "courses",
                kind: InsightDatasetKind.Courses,
                numRows: 64612
            }
        ];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);

        try {
            result = await insightFacade.listDatasets();
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });

    it("Test listDatasets by add two valid datasets", async () => {
        const id: string = "courses";
        let result: InsightDataset[];
        const expected: InsightDataset[] = [
            {
                id: "courses",
                kind: InsightDatasetKind.Courses,
                numRows: 64612
            },
            {
                id: "courses2",
                kind: InsightDatasetKind.Courses,
                numRows: 64612
            }
        ];

        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        await insightFacade.removeDataset(id);
        await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        await insightFacade.addDataset("courses2", datasets[id], InsightDatasetKind.Courses);

        try {
            result = await insightFacade.listDatasets();
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.deep.equal(expected);
        }
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: { id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses },
        rooms: { id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms },
    };
    let insightFacade: InsightFacade = new InsightFacade();
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises).catch((err) => {
            /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
             * for the purposes of seeing all your tests run.
             * For D1, remove this catch block (but keep the Promise.all)
             */
            return Promise.resolve("HACK TO LET QUERIES RUN");
        });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });

    it("Perform query wrong type", async () => {
        let result: any[];
        try {
            result = await insightFacade.performQuery(123);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Perform query null type", async () => {
        let result: any[];
        try {
            result = await insightFacade.performQuery(null);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });

    it("Perform query undefined type", async () => {
        let result: any[];
        try {
            result = await insightFacade.performQuery(undefined);
        } catch (err) {
            result = err;
        } finally {
            expect(result).to.be.instanceOf(InsightError);
        }
    });
});
