var cfTaskURL = "http://route.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World/";
var webMapID = "6fdf3e4a0a8a4f7bb060765e9e658092";

var map, searchLayer, cfTask, cfParams, routeSymbol;

dojo.ready(function() {

  require(["esri/arcgis/utils",
      "esri/tasks/ClosestFacilityTask",
      "esri/tasks/ClosestFacilityParameters",
      "esri/tasks/FeatureSet",
      "esri/symbols/SimpleLineSymbol",
      "dojo/_base/Color"
    ],
    function(arcGISUtils, ClosestFacilityTask, ClosestFacilityParameters,
      FeatureSet, SimpleLineSymbol, Color) {
      dojo.addOnUnload(storeCredentials);
      // look for credentials in local storage
      loadCredentials();

      var mapDeferred = arcGISUtils.createMap(webMapID, "mapDiv");

      mapDeferred.then(function(response) {
        // Set our global reference
        map = response.map;

        // Find the layer with the data we'll search for on click.
        for (i = 0; i < map.graphicsLayerIds.length; i++) {
          if (map.graphicsLayerIds[i].lastIndexOf("Market", 0) === 0) {
            searchLayer = map.getLayer(map.graphicsLayerIds[i]);
            break;
          }
        }

        // Initialize the Closest Facility Task
        cfTask = new ClosestFacilityTask(cfTaskURL);

        // Set up some template parameters to call it with
        cfParams = new ClosestFacilityParameters();
        cfParams.outSpatialReference = map.spatialReference;
        cfParams.defaultCutoff = 30.0;
        cfParams.returnRoutes = true;
        cfParams.defaultTargetFacilityCount = 3;
        cfParams.travelDirection = esri.tasks.NATravelDirection.TO_FACILITY;

        // Tell it to route us to features in the layer we found earlier (Markets)
        cfParams.facilities = new esri.tasks.DataFile();
        cfParams.facilities.url = searchLayer.url + "/query?where=1%3D1&returnGeometry=true&outFields=OBJECTID&f=json";

        // Prepare a place to keep our map-click as the source
        cfParams.incidents = new FeatureSet();

        // And set up the symbol we'll use to draw the routes to the markets
        routeSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
          new Color([75, 180, 255, 0.8]),
          4.5);

        // Set up the click handler.
        dojo.connect(map, "onClick", function(evt) {
          // Set up the start point for our search, an "Incident"
          var g = new esri.Graphic(evt.mapPoint);
          cfParams.incidents.features = [g];

          // And run the task
          cfTask.solve(cfParams, function(solveResult) {
            map.graphics.clear();
            // Zoom to the results
            map.setExtent(esri.graphicsExtent(solveResult.routes).expand(1.1), true);
            // Draw the results
            for (i = 0; i < solveResult.routes.length; i++) {
              solveResult.routes[i].symbol = routeSymbol;
              map.graphics.add(solveResult.routes[i]);
            }
          }, function(error) {
            console.log("Couldn't get closest markets! " + error);
          });
        });
      }, function(error) {
        console.log("Map creation failed: ", dojo.toJson(error));
      });
    });
});

// To help with the map layout, we need these dojo layout components.
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");