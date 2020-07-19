const axios = require("axios");
var fs = require("fs");
axios
  .get(
    "https://www.kaltura.com/api_v3/service/session/action/start?format=1&clientTag=devkcom&partnerId=27017&secret=e86414987de84cabc69e81b913bb3da2&type=2"
  )
  .then(response => {
    const newKS = response.data;
    const myFile = fs.readFile("../test/config.json", "utf8", function(
      err,
      contents
    ) {
      const fileContent = JSON.parse(contents);
      fileContent.data.ks = newKS;
      fs.writeFile(
        "../test/config.json",
        JSON.stringify(fileContent, undefined, 4),
        "utf8",
        () => {
          console.log("Done replacing KS");
        }
      );
    });
  })
  .catch(error => {
    console.log(error);
  });
