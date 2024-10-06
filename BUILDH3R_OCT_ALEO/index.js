import {
  Account,
  initThreadPool,
  ProgramManager,
  AleoKeyProvider,
  AleoKeyProviderParams,
} from "@provablehq/sdk";

await initThreadPool();

const programName = "driving_status.aleo";

const driving_status_program = `
    program ${programName};
    
    struct PersonalInfo:
      name as field;
      gender as field;
      age as u8;
      has_license as boolean;
      license_expiry as u32;
      infractions as u8;
  
  
  function can_drive_legally:
      input r0 as PersonalInfo.private;
      gt r0.license_expiry 1698710400u32 into r1;
      and r0.has_license r1 into r2;
      gte r0.age 16u8 into r3;
      lt r0.infractions 3u8 into r4;
      and r2 r3 into r5;
      and r5 r4 into r6;
      output r6 as boolean.private;`;

async function localProgramExecution(
  program,
  programName,
  aleoFunction,
  inputs
) {
  const programManager = new ProgramManager();

  // Create a temporary account for the execution of the program
  const account = new Account();
  programManager.setAccount(account);

  // Create a key provider in order to re-use the same key for each execution
  const keyProvider = new AleoKeyProvider();
  keyProvider.useCache(true);
  programManager.setKeyProvider(keyProvider);

  // Pre-synthesize the program keys and then cache them in memory using key provider
  const keyPair = await programManager.synthesizeKeys(
    driving_status_program,
    aleoFunction,
    inputs
  );
  programManager.keyProvider.cacheKeys(
    `${programName}:${aleoFunction}`,
    keyPair
  );

  // Specify parameters for the key provider to use search for program keys. In particular specify the cache key
  // that was used to cache the keys in the previous step.
  const keyProviderParams = new AleoKeyProviderParams({
    cacheKey: `${programName}:${aleoFunction}`,
  });

  // Execute once using the key provider params defined above. This will use the cached proving keys and make
  // execution significantly faster.
  let executionResponse = await programManager.run(
    program,
    aleoFunction,
    inputs,
    true,
    undefined,
    keyProviderParams
  );
  console.log(
    "driving_status/can_drive_legally executed - result:",
    executionResponse.getOutputs()
  );

  // Verify the execution using the verifying key that was generated earlier.
  if (programManager.verifyExecution(executionResponse)) {
    console.log("driving_status/can_drive_legally execution verified!");
  } else {
    throw "Execution failed verification!";
  }
}

const start = Date.now();
console.log("Starting execute!");

// Create My personal data
const my_info = {
  name: 0, // In Leo, strings are represented as field elements; 0 means empty string
  gender: 2, // 1 represent "Male", 2 "Female", 3 "Other", etc.
  age: 25,
  has_license: true,
  license_expiry: 1730332800, // "2024-10-31",
  infractions: 0,
};

// Convert the default data to the format expected by the Aleo program
const inputData = `{ name: ${my_info.name}field,  gender: ${my_info.gender}field, age: ${my_info.age}u8, has_license: ${my_info.has_license}, license_expiry: ${my_info.license_expiry}u32, infractions: ${my_info.infractions}u8}`;

console.log("Loading my personal data!");
console.log(inputData);
console.log("Completed loading my personal Data!");

await localProgramExecution(
  driving_status_program,
  programName,
  "can_drive_legally",
  [inputData]
);
console.log("Execute finished!", Date.now() - start);
