import { importSchools } from './import-schools';

importSchools().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
