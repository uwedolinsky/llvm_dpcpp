module.exports = ({core, process}) => {
  const fs = require('fs');
  fs.readFile('./devops/test_configs.json', 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file from disk: ${err}`);
    } else {
      const testConfigs = JSON.parse(data);
      const inputs = JSON.parse(process.env.GHA_INPUTS);
      const needsDrivers = inputs.drivers_update_needed == 'true';

      const ltsConfigs = inputs.lts_config.split(';');

      const enabledLTSLxConfigs = [];
      const enabledLTSWnConfigs = [];
      const enabledLTSAWSConfigs = [];

      // Process LTS (LLVM Test Suite)

      testConfigs.lts.forEach(v => {
        if (ltsConfigs.includes(v.config)) {
          // Check for CUDA machines. If available, add them to
          // enabledLTSLxConfigs.
          var hasCuda = false;
          if (Array.isArray(v["runs-on"]))
            hasCuda = v["runs-on"].some(e => e.includes("aws-cuda"));
          else
            hasCuda = v["runs-on"].includes("aws-cuda")

          if (v["runs-on"].includes("Windows"))
            enabledLTSWnConfigs.push(v);
          else if (v["runs-on"].includes("Linux") || hasCuda)
            enabledLTSLxConfigs.push(v);
          else
            console.error("runs-on OS is not recognized");
          if (v["aws-type"]) enabledLTSAWSConfigs.push(v);
        }
      });

      let ltsLxString = JSON.stringify(enabledLTSLxConfigs);
      let ltsWnString = JSON.stringify(enabledLTSWnConfigs);
      let ltsAWSString = JSON.stringify(enabledLTSAWSConfigs);
      console.log("Linux LTS config:")
      console.log(ltsLxString);
      console.log("Windows LTS config:")
      console.log(ltsWnString);
      console.log("Linux AWS LTS config:")
      console.log(ltsAWSString)

      // drivers update is supported on Linux only
      for (let [key, value] of Object.entries(inputs)) {
        ltsLxString =
            ltsLxString.replaceAll("${{ inputs." + key + " }}", value);
        ltsAWSString = ltsAWSString.replaceAll("${{ inputs." + key + " }}", value);
      }
      if (needsDrivers) {
        ltsLxString = ltsLxString.replaceAll(
            "ghcr.io/intel/llvm/ubuntu2204_intel_drivers:latest",
            "ghcr.io/intel/llvm/ubuntu2204_base:latest");
        ltsAWSString = ltsAWSString.replaceAll(
            "ghcr.io/intel/llvm/ubuntu2204_intel_drivers:latest",
            "ghcr.io/intel/llvm/ubuntu2204_base:latest");
      }

      core.setOutput('lts_lx_matrix', ltsLxString);
      core.setOutput('lts_wn_matrix', ltsWnString);
      core.setOutput('lts_aws_matrix', ltsAWSString);

      // Process CTS (Conformance Test Suite)

      const ctsConfigs = inputs.cts_config.split(';');

      const enabledCTSConfigs = [];

      testConfigs.cts.forEach(v => {
        if (ctsConfigs.includes(v.config)) {
          enabledCTSConfigs.push(v);
        }
      });

      let ctsString = JSON.stringify(enabledCTSConfigs);
      console.log("CTS config:")
      console.log(ctsString);

      for (let [key, value] of Object.entries(inputs)) {
        ctsString = ctsString.replaceAll("${{ inputs." + key + " }}", value);
      }
      if (needsDrivers) {
        ctsString = ctsString.replaceAll(
            "ghcr.io/intel/llvm/ubuntu2204_intel_drivers:latest",
            "ghcr.io/intel/llvm/ubuntu2204_base:latest");
      }

      core.setOutput('cts_matrix', ctsString);
    }
  });
}
