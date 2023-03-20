// Import required modules
const componentGenerator = require("node-jq");
const fs = require("fs");
const yaml = require("js-yaml");
const lodash = require("lodash");

// Main function
(async () => run("./input.json", "./output.json"))();


/**
 * @param inputFile Json or yaml input file
 * @param outputFile Json or yaml output file
 * @type {(inputFile: string, outputFile: string) => void}
 * @return void
 */
async function run(inputFile, outputFile) {
    // Check if the input file exists
    if (!fs.existsSync(inputFile)) {
        console.log("No input file found!");
        return;
    }

    // Read the input file and parse it into a JSON object
    let file = fs.readFileSync(inputFile, "utf-8");
    let json = inputFile.endsWith("yaml") ? yaml.load(file) : JSON.parse(file);

    // If the JSON object doesn't have a "components" property, create one with a "schemas" sub-property
    json.components ??= {};

    // If the "components" property exists but doesn't have a "schemas" sub-property, create one
    json.components.schemas ??= {};

    // Define JQ filter to extract all "properties" objects from the input JSON or YAML file
    let filter = "[..|.properties? | select(. != null)]";
    let componentsJson = await componentGenerator.run(filter, json, {input: "json"});

    // Run the JQ filter on the input JSON object to extract all "properties" objects and convert them into an array of JSON objects
    let correctComponentTypes = findComponentTypes(componentsJson);
    let allComponentCases = getAllComponentCases(componentsJson);

    // Run the JQ filter on the input JSON object to extract all "properties" objects and merge them into a single JSON object
    let output = await componentGenerator.run(filter + " | add", json, {input: "json"})
    let js = JSON.parse(output);

    // Replace any ID strings in the JSON object's path keys with placeholders
    replacePathIdsWithPlaceholders(json)

    // Create an empty array to store the components and sort them by whether they have "properties" or "items"
    let components = [];

    for (let key of Object.keys(js)) {
        components[key] = js[key];
    }

    let func = (a) => a["properties"] || a["items"];

    components = Object.entries(components).sort(([, a], [, b]) => {
        return func(a) && !func(b) ? -1 : !func(a) && func(b) ? 1 : 0;
    });

    let finalComp = {};

    for (let [, [key, component]] of Object.entries(components)) {
        let finalComponent = {};

        for (const comp of allComponentCases[key]) {
            const schemaObject = {[key]: comp};
            finalComponent = lodash.merge(finalComponent, schemaObject);
        }
        finalComp[key] = finalComponent;
    }

    let replaced = {};

    // Loop through the sorted components array and process each component
    for (let [, [key, component]] of Object.entries(components)) {
        console.log(`Found component ${key}`)
        if (correctComponentTypes[key]) {
            component.type = correctComponentTypes[key]
        }

        const schemaRef = `#/components/schemas/${key}`;
        const schemaString = JSON.stringify(json);
        let outputText = schemaString

        const schemaObject = {[key]: component};

        outputText = outputText
            .replaceAll(JSON.stringify(schemaObject), `{"${key}":{"$ref":"${schemaRef}"}}`)
            .replaceAll(`"${key}":${JSON.stringify(component)}`, `"${key}":{"$ref":"${schemaRef}"}`);

        if (component.type !== "object") {
            outputText = outputText.replaceAll(schemaString.replaceAll(`"type":"${component.type}"`, `"type":"object"`), `{"${key}":{"$ref":"${schemaRef}"}}`)
            outputText = outputText.replaceAll(`"${key}":${JSON.stringify(component).replaceAll(`"type":"${component.type}"`, `"type":"object"`)}`, `"${key}":{"$ref":"${schemaRef}"}`)
        }

        replaced[schemaRef] = component;

        json = JSON.parse(outputText);

        let finalCompVal = JSON.stringify(finalComp[key]);
        for(let [key, val] of Object.entries(replaced)){
            //TODO Replace all the previous replaced values in the finalCompVal with ref
            const schemaObject = {[key]: val};
            const schemaRef = `#/components/schemas/${key}`;

            finalCompVal = finalCompVal
                .replaceAll(JSON.stringify(schemaObject), `{"${key}":{"$ref":"${schemaRef}"}}`)
                .replaceAll(`"${key}":${JSON.stringify(component)}`, `"${key}":{"$ref":"${schemaRef}"}`);
        }

        replaced[key] = component

        // add the component schema to the json object
        json.components.schemas[key] = JSON.parse(finalCompVal);
    }
    console.log(replaced)

    let paths =  await componentGenerator.run("[.] | add", json.paths, {input: "json"})
    json.paths = JSON.parse(paths);

    // write the modified json object to the output file
    fs.writeFile(outputFile, outputFile.endsWith("yaml") ? yaml.dump(json) : JSON.stringify(json, null, 2), function (err) {
        if (err) {
            console.log(err);
        }
    });
}

function findComponentTypes(jsIn) {
    const js = JSON.parse(jsIn);
    console.log("Finding component types");
    // Create an empty object to store temporary components
    let tempComps = {};

    // Loop through the array of JSON objects and extract the "type" property of each "properties" object
    for (let val of Object.values(js)) {
        let jsVal = val;

        for (let key of Object.keys(jsVal)) {
            let type = jsVal[key]?.["type"];
            // If the "key" property already exists in the temporary components object and its type is "object", replace the type with the new type
            if (key && type) {
                if (tempComps[key]) {
                    if (tempComps[key] === "object" && type !== "object") {
                        tempComps[key] = type;
                        console.log(`Found component type for ${key}: ${type}`);
                    }
                } else if (type !== "object") {
                    tempComps[key] = type;
                    console.log(`Found component type for ${key}: ${type}`);
                }
            }
        }
    }
    return tempComps;
}

function getAllComponentCases(jsIn) {
    const js = JSON.parse(jsIn);
    console.log("Finding component types");
    // Create an empty object to store temporary components
    let tempComps = {};

    // Loop through the array of JSON objects and extract the "type" property of each "properties" object
    for (let val of Object.values(js)) {
        let jsVal = val;

        for (let key of Object.keys(jsVal)) {
            tempComps[key] ??= [];
            tempComps[key].push(jsVal[key]);
        }
    }
    return tempComps;
}

/**
 * Replaces path IDs with placeholders in the JSON object.
 * @param {object} json - The JSON object.
 * @param {string} [placeholderPrefix="id_"] - The prefix to use for placeholder names.
 * @returns {object} - The modified JSON object.
 */
function replacePathIdsWithPlaceholders(json, placeholderPrefix = "id_") {
    const pathKeys = Object.keys(json.paths);
    const idRegex = /\b[0-9A-Fa-f]+\b/gm;

    for (const path of pathKeys) {
        let idCounter = 0;
        let updatedPath = path;
        const idMatches = updatedPath.matchAll(idRegex);

        for (const match of idMatches) {
            // replace the path ID with a placeholder
            const placeholderName = `${placeholderPrefix}${idCounter}`;
            updatedPath = updatedPath.replaceAll(match[0], `{${placeholderName}}`);

            // add a path parameter for the placeholder
            for (const type of Object.keys(json.paths[path])) {
                const pathObj = json.paths[path][type];
                if (pathObj.summary) {
                    pathObj.summary = pathObj.summary.replaceAll(match[0], `{${placeholderName}}`);
                }

                (pathObj.parameters ??= []).push({
                    "name": placeholderName,
                    "in": "path",
                    "required": true
                });
            }
            idCounter++;
        }

        if (updatedPath !== path) {
            // update the path key with the updated path
            json.paths[updatedPath] = json.paths[path];
            delete json.paths[path];
        }
    }

    return json;
}