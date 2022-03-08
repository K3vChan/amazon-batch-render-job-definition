const run = require('.');
const core = require('@actions/core');
const tmp = require('tmp');
const fs = require('fs');

jest.mock('@actions/core');
jest.mock('tmp');
jest.mock('fs');

describe('Render', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('job-definition.json') // job-definition
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('FOO=bar\nHELLO=world'); // environment-variables

        process.env = Object.assign(process.env, { GITHUB_WORKSPACE: __dirname });
        process.env = Object.assign(process.env, { RUNNER_TEMP: '/home/runner/work/_temp' });

        tmp.fileSync.mockReturnValue({
            name: 'new-job-def-file-name'
        });

        fs.existsSync.mockReturnValue(true);

        jest.mock('./job-definition.json', () => ({
            containerProperties: {
                image: "some-other-image",
                environment: [
                    {
                        name: "FOO",
                        value: "not bar"
                    },
                    {
                        name: "DONT-TOUCH",
                        value: "me"
                    }
                ]
            }

        }), { virtual: true });
    });

    test('renders the job definition and creates a new job definition file', () => {
        run();
        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            tmpdir: '/home/runner/work/_temp',
            prefix: 'job-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                containerProperties: {
                    image: "nginx:latest",
                    environment: [
                        {
                            name: "FOO",
                            value: "bar"
                        },
                        {
                            name: "DONT-TOUCH",
                            value: "me"
                        },
                        {
                            name: "HELLO",
                            value: "world"
                        }
                    ]
                }

            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'job-definition', 'new-job-def-file-name');
    });

    test('renders a job definition at an absolute path, and with initial environment empty', () => {
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('/hello/job-definition.json') // job-definition
            .mockReturnValueOnce('nginx:latest')         // image
            .mockReturnValueOnce('EXAMPLE=here');        // environment-variables
        jest.mock('/hello/job-definition.json', () => ({
            containerProperties: {
                image: "some-other-image"
            }
        }), { virtual: true });

        run();

        expect(tmp.fileSync).toHaveBeenNthCalledWith(1, {
            tmpdir: '/home/runner/work/_temp',
            prefix: 'job-definition-',
            postfix: '.json',
            keep: true,
            discardDescriptor: true
          });
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, 'new-job-def-file-name',
            JSON.stringify({
                containerProperties: {
                    image: "nginx:latest",
                    environment: [
                        {
                            name: "EXAMPLE",
                            value: "here"
                        }
                    ]
                }

            }, null, 2)
        );
        expect(core.setOutput).toHaveBeenNthCalledWith(1, 'job-definition', 'new-job-def-file-name');
    });

    test('error returned for missing job definition file', () => {
        fs.existsSync.mockReturnValue(false);
        core.getInput = jest
            .fn()
            .mockReturnValueOnce('does-not-exist-job-definition.json')
            .mockReturnValueOnce('nginx:latest');

        run();

        expect(core.setFailed).toBeCalledWith('Job definition file does not exist: does-not-exist-job-definition.json');
    });

    test('error returned for non-JSON job definition contents', () => {
        jest.mock('./non-json-job-definition.json', () => ("hello"), { virtual: true });

        core.getInput = jest
            .fn()
            .mockReturnValueOnce('non-json-job-definition.json')
            .mockReturnValueOnce('nginx:latest');

        run();

        expect(core.setFailed).toBeCalledWith('Invalid job definition: Could not find container definition');
    });

    test('error if env var are not in the form of var=value', () => {
        core.getInput = jest
        .fn()
        .mockReturnValueOnce('/hello/job-definition.json') // job-definition
        .mockReturnValueOnce('nginx:latest')         // image
        .mockReturnValueOnce('EXAMPLE+here');        // environment-variables

        run();

        expect(core.setFailed).toBeCalledWith("Cannot parse the environment variable 'EXAMPLE+here'. Environment variable pairs must be of the form NAME=value.");
    });
});
