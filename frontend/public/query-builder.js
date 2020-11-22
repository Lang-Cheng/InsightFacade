/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let columns = getColumns();
    let order = getOrder();
    let groups = getGroups();
    let conditions = getConditions();
    let transformations = getTransformations();
    let firstOperator = getFirstOperator();

    query = {
        "WHERE": {},
        "OPTIONS": {
            "COLUMNS": columns,
        }
    }

    if (order.keys.length > 0) {
        console.log(order);
        query["OPTIONS"]["ORDER"] = order;
    }

    if (conditions.length > 0) {
        if (conditions.length == 1 && firstOperator !== "NOT") {
            query["WHERE"] = conditions[0]
        } else {
            query["WHERE"] = {
                [firstOperator]: conditions
            }
        }
    }

    if (groups.length > 0) {
        query["TRANSFORMATIONS"] = {
            "GROUP": groups
        };
        if (transformations.length > 0) {
            query["TRANSFORMATIONS"]["APPLY"] = transformations;
        }
    }
    return query;
};

function appendType(array) {
    const type = getType();
    const result = [];
    for (const element of array) {
        result.push(type + "_" + element);
    }
    return result;
}

function appendSingleType(element) {
    return getType() + "_" + element;
}

function getTransformations() {
    let transformations = [];
    let transformationsContainer = document.getElementsByClassName("transformations-container")[getTypeNum()].children;
    for (const te of transformationsContainer) {
        let term = te.getElementsByClassName("control term")[0]
            .getElementsByTagName("input")[0].value;
        let operator = te.getElementsByClassName("control operators")[0]
            .getElementsByTagName("select")[0].value;
        let field = appendSingleType(te.getElementsByClassName("control fields")[0]
            .getElementsByTagName("select")[0].value);

        let transformation = {
            [term]: {
                [operator]: field
            }
        };
        transformations.push(transformation);

    }
    return transformations;
}

function getType() {
    let element = document.getElementsByClassName("nav-item tab active")[0].text;
    return element.toLowerCase();
}

function getTypeNum() {
    return getType() === "courses" ? 0 : 1;
}

function getConditions() {
    let conditions = [];
    let conditionsContainer = document.getElementsByClassName("conditions-container")[getTypeNum()].children;
    for (const ce of conditionsContainer) {
        let not = ce.getElementsByClassName("control not")[0]
            .getElementsByTagName("input")[0].checked;
        let field = appendSingleType(ce.getElementsByClassName("control fields")[0]
            .getElementsByTagName("select")[0].value);
        let operator = ce.getElementsByClassName("control operators")[0]
            .getElementsByTagName("select")[0].value;
        let term = ce.getElementsByClassName("control term")[0]
            .getElementsByTagName("input")[0].value;

        let numberKeys = [
            "courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year",
            "rooms_lat", "rooms_lon", "rooms_seats"
        ];

        if (numberKeys.indexOf(field) !== -1) {
            term = Number(term);
        }

        let condition = {
            [operator]: {
                [field]: term
            }
        };

        if (not) {
            condition = {
                "NOT": condition
            };
        }
        conditions.push(condition);
    }
    return conditions;
}

function getFirstOperator() {
    let element = document.getElementsByClassName("control conditions-all-radio")[getTypeNum()].children[0];
    if (element.checked) {
        return "AND";
    }
    element = document.getElementsByClassName("control conditions-any-radio")[getTypeNum()].children[0];
    if (element.checked) {
        return "OR";
    }
    element = document.getElementsByClassName("control conditions-none-radio")[getTypeNum()].children[0];
    if (element.checked) {
        return "NOT";
    }
}

function getOrder() {
    let order = {};

    let descendingBox = document.getElementsByClassName("control descending")[getTypeNum()].children[0];
    if (descendingBox.checked) {
        order["dir"] = "DOWN";
    } else {
        order["dir"] = "UP";
    }

    keys = [];
    let options = document.getElementsByClassName("control order fields")[getTypeNum()]
        .getElementsByTagName("option");
    for (const option of options) {
        if (option.selected) {
            if (option.className === "transformation") {
                keys.push(option.value);
            } else {
                keys.push(appendSingleType(option.value));
            }
        }
    }
    order["keys"] = keys;

    return order;
}

function getGroups() {
    let groups = [];
    let groupElements = document.getElementsByClassName("form-group groups")[getTypeNum()]
        .getElementsByTagName("input");

    for (const element of groupElements) {
        if (element.checked) {
            groups.push(appendSingleType(element.value));
        }
    }
    return groups;
}

function getColumns() {
    let columns = [];
    let columnElements = document.getElementsByClassName("form-group columns")[getTypeNum()]
        .getElementsByTagName("input");

    for (const element of columnElements) {
        if (element.checked) {
            if (element.id === "") {
                columns.push(element.value);
            } else {
                columns.push(appendSingleType(element.value));
            }
        }
    }
    return columns;
}
