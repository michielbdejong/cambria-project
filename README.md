# Cambria

Cambria is a Javascript/Typescript library for converting JSON data between related schemas.

You specify (in YAML or JSON) a _lens_, which specifies a data transformation. Cambria lets you use this lens to convert:

- a whole document, in JSON
- an edit to a document, in [JSON Patch](http://jsonpatch.com/)
- a schema description, in [JSON Schema](https://json-schema.org/)

Lenses are bidirectional. Once you've converted a document from schema A to schema B, you can edit the document in schema B and propagate those edits _backwards through the same lens_ to schema A.

**For more background on why Cambria exists and what it can do, see the [research essay](https://www.inkandswitch.com/cambria.html).**

⚠ Cambria is still immature software, and isn't yet ready for production use

## Use cases

- Manage backwards compatibility in a JSON API
- Manage database migrations for JSON data
- Transform a JSON document into a different shape on the command line
- Combine with [cambria-automerge](https://github.com/inkandswitch/cambria-automerge) to collaborate on documents across multiple versions of [local-first software](https://www.inkandswitch.com/local-first.html)

## CLI Usage

Cambria includes a simple CLI tool for converting JSON from the command line.

(You'll want to run `yarn build` to compile the latest code.)

Covert the github issue into a an arthropod-style issue:

`cat ./demo/github-issue.json | node ./dist/cli.js -l ./demo/github-arthropod.lens.yml`

To get a live updating pipeline using `entr`:

`echo ./demo/github-arthropod.lens.yml | entr bash -c "cat ./demo/github-issue.json | node ./dist/cli.js -l ./demo/github-arthropod.lens.yml > ./demo/simple-issue.json"`

Compile back from an updated "simple issue" to a new github issue file:

`cat ./demo/simple-issue.json | node ./dist/cli.js -l ./demo/github-arthropod.lens.yml -r -b ./demo/github-issue.json`

Live updating pipeline backwards:

`echo ./demo/simple-issue.json | entr bash -c "cat ./demo/simple-issue.json | node ./dist/cli.js -l ./demo/github-arthropod.lens.yml -r -b ./demo/github-issue.json > ./demo/new-github-issue.json"`

## API Usage

Cambria is mostly intended to be used as a Typescript / Javascript library. Here's a simple example of converting an entire document.

```js
// read doc from stdin if no input specified
const input = readFileSync(program.input || 0, 'utf-8')
const doc = JSON.parse(input)

// we can (optionally) apply the contents of the changed document to a target document
const targetDoc = program.base ? JSON.parse(readFileSync(program.base, 'utf-8')) : {}

// now load a (yaml) lens definition
const lensData = readFileSync(program.lens, 'utf-8')
let lens = loadYamlLens(lensData)

// should we reverse this lens?
if (program.reverse) {
  lens = reverseLens(lens)
}

// finally, apply the lens to the document, with the schema, onto the target document!
const newDoc = applyLensToDoc(lens, doc, program.schema, targetDoc)
console.log(JSON.stringify(newDoc, null, 4))
```

## Lens Operations

### add(name, type)

Add a field
Example lens file:

```yml
- add:
    name: completed
    type: boolean
```

Effect:

```sh
$ echo '{"title":"Found a bug"}' | node ./dist/cli.js -l ./examples/add.yml
{
    "title": "Found a bug",
    "completed": false
}
```

### remove(name)

Remove a field
Example lens file:

```yml
- remove: { name: completed }
```

Effect:

```sh
$ echo '{"title":"Found a bug","completed":true}' | node ./dist/cli.js -l ./examples/remove.yml
{
    "title": "Found a bug"
}
```

### rename(source, destination)

Rename a field
Example:

```yml
- rename:
    source: title
    destination: name
```

Effect:

```sh
$ echo '{"title":"Found a bug"}' | node ./dist/cli.js -l ./examples/rename.yml
{
    "name": "Found a bug"
}
```

### hoist(name, host)

Pull a field out of an object
Example:

```yml
- hoist:
    name: login
    host: user
```

Effect:

```sh
$ echo '{"title":"Found a bug", "user":{"login":"octocat"}}' | node ./dist/cli.js -l ./examples/hoist.yml
{
    "title": "Found a bug",
    "user": {},
    "login": "octocat"
}
```

### plunge(name, host)

Move a field into an existing object
Example:

```yml
- add:
    name: user
    type: object
- plunge:
    name: login
    host: user
```

Effect:

```sh
$ echo '{"title":"Found a bug", "login":"octocat"}' | node ./dist/cli.js -l ./examples/plunge.yml
{
    "title": "Found a bug",
    "user": {
        "login": "octocat"
    }
}
```

### head(name)

Replace an array field by its first element
Example:

```yml
- head: { name: assignee }
```

Effect:

```sh
$ echo '{"title":"Found a bug", "assignee":["octocat", "someone"]}' | node ./dist/cli.js -l ./examples/head.yml
{
    "title": "Found a bug",
    "assignee": "octocat"
}
```

### wrap(name)

Replace a scalar field by an array containing it as its only element
Example:

```yml
- wrap: { name: assignee }
```

Effect:

```sh
$ echo '{"title":"Found a bug", "assignee":"octocat"}' | node ./dist/cli.js -l ./examples/wrap.yml
{
    "title": "Found a bug",
    "assignee": [
        "octocat"
    ]
}
```

### in(name, lens)

Apply a lens inside an object
Example:

```yml
- in:
    name: user
    lens:
      - remove:
          name: login
```

Effect:

```sh
$ echo '{"title":"Found a bug", "user":{"login":"octocat"}}' | node ./dist/cli.js -l ./examples/in.yml
{
    "title": "Found a bug",
    "user": {}
}
```

### map(lens)

In an array, apply a lens to each item

```yml
- in:
    name: assignees
    lens:
      - map:
          lens:
            - add:
                name: admin
                type: boolean
```

Effect:

```sh
$ echo '{"title":"Found a bug", "assignees":[{"login":"octocat"}]}' | node ./dist/cli.js -l ./examples/map.yml
{
    "title": "Found a bug",
    "assignees": [
        {
            "login": "octocat",
            "admin": false
        }
    ]
}
```

### convert(name, mapping)

Convert an enumerable field to another set of values
Example:

```yml
- convert:
    name: status
    mapping:
    # old to new
    - open: todo
        closed: done
    # new to old
    - todo: open
        doing: open
        done: closed
```

Effect:

```sh
$ echo '{"title":"Found a bug", "status":"open"}' | node ./dist/cli.js -l ./examples/convert.yml
{
    "title": "Found a bug",
    "status": "todo"
}
```

### extract(host, name, fields)

Convert an array of objects into two, by extracting some of the fields
Example:

```yml
$ echo '{
   "orders": [
    {
      "item":"anvil",
      "quantity": 1,
      "ship_date": "2/3/23",
      "customer_name": "Wile E Coyote",
      "customer_address": "123 Desert Station"
    },
    {
      "item":"dynamite",
      "quantity": 2,
      "ship_date": null,
      "customer_name": "Daffy Duck",
      "customer_address": "White Rock Lake"
    },
    {
      "item":"bird seed",
      "quantity": 1,
      "ship_date": null,
      "customer_name": "Wile E Coyote",
      "customer_address": "123 Desert Station"
    }
  ]
}' | node ./dist/cli.js -l ./examples/extract.yml
## Install

If you're using npm, run `npm install cambria`. If you're using yarn, run `yarn add cambria`. Then you can import it with `require('cambria')` as in the examples (or `import * as Cambria from 'cambria'` if using ES2015 or TypeScript).

## Tests

`npm run test`
```
