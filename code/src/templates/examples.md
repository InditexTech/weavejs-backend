# Example 1

```
{
  "version": "1.0",
  "name": "test",
  "nodes": [
    {
      "id": "8def952a-83df-46cb-9c7f-3d61919df8c9",
      "x": 0,
      "y": 0,
      "width": 500,
      "height": 889
    },
    {
      "id": "547832a9-961d-4b3c-a3f5-737eae536e85",
      "x": 1220,
      "y": 0,
      "width": 500,
      "height": 889
    },
    {
      "id": "db49dd28-25b2-44c1-9690-e00df25d979a",
      "x": 610,
      "y": 0,
      "width": 500,
      "height": 889
    }
  ]
}
```

TARGETS:

```
"id": "mainLayer",
"position": {
  "x": 0,
  "y": 0
}
```

```
"id": "e5164b8a-26e3-4d1b-83c9-cff9bd9ea3cf",
"position": {
  "x": 100,
  "y": 94.5
}
```

API CALL:

```
{
	"roomId": "b567158a-09c1-403a-9d73-a65b0168cf5e",
	"pageId": "db1c2f45-9467-4caa-b31f-85b0c431e2b7",
	"template": {
		"version": "1.0",
		"name": "test",
		"target": {
			"id": "mainLayer",
      "position": {
        "x": 0,
        "y": 0
      }
		},
		"nodes": [
			{
				"id": "image-1",
				"x": 0,
				"y": 0,
				"width": 500,
				"height": 889,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/10/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			},
			{
				"id": "image-2",
				"x": 610,
				"y": 0,
				"width": 500,
				"height": 889,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/237/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			},
			{
				"id": "image-3",
				"x": 1220,
				"y": 0,
				"width": 500,
				"height": 889,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/20/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			}
		]
	}
}
```

====

# Example 2

```
{
  "version": "1.0",
  "name": "test",
  "nodes": [
    {
      "id": "62d57abd-8258-4b9e-a467-79344be68b94",
      "x": 0,
      "y": 0,
      "width": 500,
      "height": 400
    },
    {
      "id": "3f1fc452-586f-4277-a6df-d32f7b9a3971",
      "x": 1220,
      "y": 0,
      "width": 500,
      "height": 889
    },
    {
      "id": "e32c730d-4b6a-4821-bd0f-4d3a4d132e26",
      "x": 610,
      "y": 0,
      "width": 500,
      "height": 889
    },
    {
      "id": "e9b58c20-6383-4160-96d1-6b0d811c39fd",
      "x": 0,
      "y": 489,
      "width": 500,
      "height": 400
    }
  ]
}
```

API CALL:

```
{
	"roomId": "b567158a-09c1-403a-9d73-a65b0168cf5e",
	"pageId": "db1c2f45-9467-4caa-b31f-85b0c431e2b7",
	"template": {
		"version": "1.0",
		"name": "test",
		"target": {
			"id": "mainLayer",
			"position": {
				"x": 0,
				"y": 0
			}
		},
		"nodes": [
			{
				"id": "image-1",
				"x": 0,
        "y": 0,
        "width": 500,
        "height": 400,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/10/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			},
			{
				"id": "image-2",
				"x": 1220,
        "y": 0,
        "width": 500,
        "height": 889,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/237/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			},
			{
				"id": "image-3",
				"x": 610,
        "y": 0,
        "width": 500,
        "height": 889,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/20/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			},
			{
				"id": "image-4",
				"x": 0,
        "y": 489,
        "width": 500,
        "height": 400,
				"kind": "image",
				"properties": {
					"image": {
						"source": "https://picsum.photos/id/16/800/600",
						"width": 800,
						"height": 600
					},
					"fit": "cover"
				}
			}
		]
	}
}
```
