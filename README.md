## Amazon batch "Render Job Definition" Action for GitHub Actions

Inserts a container image URI into an Amazon batch job definition JSON file, creating a new job definition file.

**Table of Contents**

<!-- toc -->

- [Amazon batch "Render Job Definition" Action for GitHub Actions](#amazon-batch-render-job-definition-action-for-github-actions)
- [Usage](#usage)
- [License Summary](#license-summary)

<!-- tocstop -->

## Usage

To insert the image URI `amazon/amazon-batch-sample:latest` as the image for job definition file, and then deploy the edited job definition file to batch:

```yaml
    - name: Render Amazon batch job definition
      id: render-web-container
      uses: K3vChan/amazon-batch-render-job-definition@v1
      with:
        job-definition: job-definition.json
        image: amazon/amazon-batch-sample:latest
        environment-variables: "LOG_LEVEL=info"

    - name: Deploy to Amazon batch service
      uses: K3vChan/amazon-batch-deploy-job-definition@v1
      with:
        job-definition: ${{ steps.render-web-container.outputs.job-definition }}
```

See [action.yml](action.yml) for the full documentation for this action's inputs and outputs.

## License Summary

This code is made available under the MIT license.
