const path = require('path');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

const getInputs = () => {
  const jobDefinitionFile = core.getInput('job-definition', { required: true });
  const imageURI = core.getInput('image', { required: true });
  const environmentVariables = core.getInput('environment-variables', { required: false });
  return {
    jobDefinitionFile,
    imageURI,
    environmentVariables
  }
}

const getJobDefinition = (jobDefinitionFile) => {
    // Parse the job definition
    const jobDefPath = path.isAbsolute(jobDefinitionFile) ?
    jobDefinitionFile :
    path.join(process.env.GITHUB_WORKSPACE, jobDefinitionFile);

  if (!fs.existsSync(jobDefPath)) {
    throw new Error(`Job definition file does not exist: ${jobDefinitionFile}`);
  }
  const jobDefContents = require(jobDefPath);
  return jobDefContents;
}

const updateContainerProperties = (jobDefContents, inputs) => {
  if (! jobDefContents.containerProperties ) {
    throw new Error('Invalid job definition: Could not find container definition');
  }

  const containerProperties = jobDefContents.containerProperties

  containerProperties.image = inputs.imageURI
  console.log(`inputs - ${JSON.stringify(inputs)}`)
  insertEnvironmentVariables(containerProperties, inputs.environmentVariables)
}

const insertEnvironmentVariables = (containerProperties, environmentVariables) => {
  if (environmentVariables) {
    // If environment array is missing, create it
    if (!Array.isArray(containerProperties.environment)) {
      containerProperties.environment = [];
    }

    // Get pairs by splitting on newlines
    environmentVariables.split('\n').forEach(function (line) {
      // Trim whitespace
      const trimmedLine = line.trim();
      // Skip if empty
      if (trimmedLine.length === 0) { return; }
      // Split on =
      const separatorIdx = trimmedLine.indexOf("=");
      // If there's nowhere to split
      if (separatorIdx === -1) {
          throw new Error(`Cannot parse the environment variable '${trimmedLine}'. Environment variable pairs must be of the form NAME=value.`);
      }
      // Build object
      const variable = {
        name: trimmedLine.substring(0, separatorIdx),
        value: trimmedLine.substring(separatorIdx + 1),
      };

      // Search container definition environment for one matching name
      const variableDef = containerProperties.environment.find((e) => e.name == variable.name);
      if (variableDef) {
        // If found, update
        variableDef.value = variable.value;
      } else {
        // Else, create
        containerProperties.environment.push(variable);
      }
    })
  }
}

const writeOutNewJobFile = (jobDefContents) => {
  var updatedJobDefFile = tmp.fileSync({
    tmpdir: process.env.RUNNER_TEMP,
    prefix: 'job-definition-',
    postfix: '.json',
    keep: true,
    discardDescriptor: true
  });
  const newJobDefContents = JSON.stringify(jobDefContents, null, 2);
  fs.writeFileSync(updatedJobDefFile.name, newJobDefContents);
  core.setOutput('job-definition', updatedJobDefFile.name);
}

const run = () => {
  try {
    const inputs = getInputs();
    const jobDefContents = getJobDefinition(inputs.jobDefinitionFile)
    updateContainerProperties(jobDefContents,  inputs);
    writeOutNewJobFile(jobDefContents)
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}
