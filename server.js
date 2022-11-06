const express = require('express');
// Import and require mysql2
const mysql = require('mysql2');
const util = require('util');
const inquirer = require('inquirer');
const { resolve } = require('path');
const { exit } = require('process');

const PORT = process.env.PORT || 3001;
const app = express();

// Express middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Connect to database
const db = mysql.createConnection(
  {
    host: '127.0.0.1',
    port: 3306,
    // MySQL username,
    user: 'root',
    // TODO: Add MySQL password here
    password: 'YOUR_PASSWORD',
    database: 'registrar_db'
  },
  console.log(`Connected to the registrar_db database.`)
);

db.query = util.promisify(db.query);
db.connect(function (err) {
  if (err) throw err;
  userPrompt();
})

const userPrompt = async () => {
  try {
    let answer = await inquirer.prompt({
      name: 'action',
      type: 'list',
      message: 'What would you like to do?',
      choices: [
        'View All Employees',
        'View All Departments',
        'View All Roles',
        'Add Employee',
        'Add Department',
        'Add Role',
        'Update Employee',
        'Exit'
      ]
    });
    switch (answer.action) {
      case 'View All Employees':
        viewAllEmployees();
        break;

      case 'View All Departments':
        viewAllDepartments();
        break;

      case 'View All Roles':
        viewAllRoles();
        break;

      case 'Add Employee':
        addEmployee();
        break

      case 'Add Department':
        addDepartment();
        break

      case 'Add Role':
        addRole();
        break

      case 'Update Employee':
        updateEmployee();
        break

      case 'Exit':
        db.end();
        exit();
    };
  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const viewAllEmployees = async () => {
  // call getEmployees and store as variable
  getEmployees().then((employees) => {
    console.table(employees);
    userPrompt();
  });
}

function getEmployees() {
  return new Promise((resolve, reject) => {
    try {
      // query for employee array and store in variable
      let employeeQuery = 'SELECT * FROM employee';
      db.query(employeeQuery, function (err, res) {
        if (err) reject(err);
        resolve(res);
      });
    } catch (err) {
      console.log(err);
      reject(err);
    };
  }).then((employees) => {
    return new Promise((resolve, reject) => {
      try {
        // query for employee array and store in variable
        let departmentQuery = 'SELECT * FROM department';
        db.query(departmentQuery, function (err, res) {
          if (err) reject(err);
          resolve({
            employees: employees,
            departments: res
          });
        });
      } catch (err) {
        console.log(err);
        reject(err);
      };
    });
  }).then((values) => {
    return new Promise((resolve, reject) => {
      try {
        // query for employee array and store in variable
        let roleQuery = 'SELECT * FROM role';
        db.query(roleQuery, function (err, res) {
          if (err) reject(err);
          resolve({
            employees: values.employees,
            departments: values.departments,
            roles: res
          });
        });
      } catch (err) {
        console.log(err);
        reject(err);
      };
    });
  }).then((values) => {
    return new Promise((resolve, reject) => {
      // update employees by replacing role_id with role name + department name + salary
      // update employees by replacing manager_id with employee[manager_id] or null
      // return employee object array
      const updatedEmployees = values.employees.map((employee) => {
        let role = values.roles[employee.role_id - 1];
        let department = values.departments[role.department_id - 1];
        var manager;
        if (employee.manager_id) {
          manager = values.employees[employee.manager_id - 1];
        } else {
          manager = null;
        }
        var managerName;
        if (manager) {
          managerName = `${manager.first_name} ${manager.last_name}`;
        } else {
          managerName = "null";
        }

        return {
          id: employee.id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          role: role.title,
          department: department.name,
          salary: role.salary,
          manager: managerName
        }
      });

      resolve(updatedEmployees);
    });
  });
}

const viewAllDepartments = async () => {
  try {
    let query = 'SELECT * FROM department';
    db.query(query, function (err, res) {
      if (err) throw err;
      console.table(res);
      userPrompt();
    });
  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const viewAllRoles = async () => {
  try {
    let query = 'SELECT * FROM role';
    db.query(query, function (err, res) {
      if (err) throw err;
      console.table(res);
      userPrompt();
    });
  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const addEmployee = async () => {
  try {
    let roles = await db.query("SELECT * FROM role");
    let managers = await db.query("SELECT * FROM employee");
    let answer = await inquirer.prompt([
      {
        name: 'firstName',
        type: 'input',
        message: 'What is the first name of this Employee?'
      },
      {
        name: 'lastName',
        type: 'input',
        message: 'What is the last name of this Employee?'
      },
      {
        name: 'employeeRoleId',
        type: 'list',
        choices: roles.map((role) => {
          return {
            name: role.title,
            value: role.id
          }
        }),
        message: "What is this Employee's role id?"
      },
      {
        name: 'employeeManagerId',
        type: 'list',
        choices: managers.map((manager) => {
          return {
            name: manager.first_name + " " + manager.last_name,
            value: manager.id
          }
        }),
        message: "What is this Employee's Manager's Id?"
      }
    ])

    await db.query("INSERT INTO employee SET ?", {
      first_name: answer.firstName,
      last_name: answer.lastName,
      role_id: (answer.employeeRoleId),
      manager_id: (answer.employeeManagerId)
    });
    console.log("Success")

    userPrompt();

  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const addDepartment = async () => {
  try {
    let answer = await inquirer.prompt([
      {
        name: 'deptName',
        type: 'input',
        message: 'What is the name of your new department?'
      }
    ]);

    await db.query("INSERT INTO department SET ?", {
      name: answer.deptName
    });

    console.log("Success")
    userPrompt();

  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const addRole = async () => {
  try {
    let departments = await db.query("SELECT * FROM department")

    let answer = await inquirer.prompt([
      {
        name: 'title',
        type: 'input',
        message: 'What is the name of your new role?'
      },
      {
        name: 'salary',
        type: 'input',
        message: 'What salary will this role provide?'
      },
      {
        name: 'departmentId',
        type: 'list',
        choices: departments.map((department) => {
          return {
            name: department.name,
            value: department.id
          }
        }),
        message: 'Choose a department ID',
      }
    ]);
    
    await db.query("INSERT INTO role SET ?", {
      title: answer.title,
      salary: answer.salary,
      department_id: answer.departmentId
    })
    console.log("Success");

    userPrompt();

  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

const updateEmployee = async () => {
  try {
    let employees = await db.query("SELECT * FROM employee");

    let employeeSelection = await inquirer.prompt([
      {
        name: 'employee',
        type: 'list',
        choices: employees.map((employeeName) => {
          return {
            name: `${employeeName.first_name} ${employeeName.last_name}`,
            value: employeeName.id
          }
        }),
        message: 'Choose an employee'
      }
    ]);

    let roles = await db.query("SELECT * FROM role");

    let roleSelection = await inquirer.prompt([
      {
        name: 'role',
        type: 'list',
        choices: roles.map((roleName) => {
          return {
            name: roleName.title,
            value: roleName.id
          }
        }),
        message: 'Choose a role'
      }
    ]);

    await db.query("UPDATE employee SET ? WHERE ?", [{ role_id: roleSelection.role }, { id: employeeSelection.employee }]);
    console.log("Success");

    userPrompt();

  } catch (err) {
    console.log(err);
    userPrompt();
  };
}

app.use((req, res) => {
  res.status(404).end();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
