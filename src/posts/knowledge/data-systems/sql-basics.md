---
layout: layouts/post.njk
title: SQL Basics
description: A SQL reference built on the COMPANY database, covering DDL (CREATE, ALTER, DROP, views) and DML (queries, subqueries, JOINs, aggregation, INSERT/UPDATE/DELETE), with MySQL differences noted.
excerpt: A SQL reference built on the COMPANY database, covering DDL (CREATE, ALTER, DROP, views) and DML (queries, subqueries, JOINs, aggregation, INSERT/UPDATE/DELETE), with MySQL differences noted.
date: 2026-10-13T12:00:00-07:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
permalink: /posts/sql-basics/index.html
---
## SQL 

Examples use the COMPANY database: EMPLOYEE, DEPARTMENT, DEPT_LOCATIONS, PROJECT, WORKS_ON, DEPENDENT.

|          | DDL <br>(Data **Definition** Language)                              | DML <br>(Data **Manipulation** Language) |
| -------- | ------------------------------------------------------------------- | ---------------------------------------- |
| Scope    | **Structure**: tables, columns, constraints, views, schemas         | **Data**: the rows in a table            |
| Commands | `CREATE` `DROP` `ALTER` <br>(incl. `CREATE VIEW`)                    | `SELECT` `INSERT` `UPDATE` `DELETE`      |

> Rule of thumb: changes *what the table looks like* → DDL; changes *what is in the table* → DML. 

## Data Types

| Category | Type | Notes | Example |
|---|---|---|---|
| Integer | `INT` / `INTEGER`, `SMALLINT` | Whole numbers; SMALLINT has a smaller range | `Dno INT` |
| Decimal (exact) | `DECIMAL(p, s)` / `NUMERIC(p, s)` | p digits total, s of them after the decimal point; **no rounding error**, good for money and GPA | `Salary DECIMAL(10,2)` → max 99999999.99 |
| Decimal (approximate) | `FLOAT` / `REAL`, `DOUBLE PRECISION` | Floating point, may have tiny errors | `Score FLOAT` |
| Fixed-length string | `CHAR(n)` | Always n characters, padded with spaces; for values of fixed length | `Ssn CHAR(9)` |
| Variable-length string | `VARCHAR(n)` | Up to n characters, stored at actual length | `Fname VARCHAR(15)` |
| Bit string | `BIT(n)`, `BIT VARYING(n)` | A string of 0s and 1s | `Flags BIT(8)` |
| Boolean | `BOOLEAN` | TRUE / FALSE / NULL | `Is_active BOOLEAN` |
| Date | `DATE` | `YYYY-MM-DD` | `'1965-01-09'` |
| Time | `TIME` | `HH:MM:SS` | `'09:30:00'` |
| Date + time | `TIMESTAMP` | DATE + TIME, optional fractional seconds and `WITH TIME ZONE` | `'2026-10-13 15:50:00'` |
| Interval | `INTERVAL` | A relative value used to increment / decrement a DATE, TIME, or TIMESTAMP | |

> - Numbers take no quotes; strings and dates take **single quotes**
> - `CHAR(n)` vs `VARCHAR(n)`: fixed length → CHAR (e.g. Ssn, state code); varying length → VARCHAR (e.g. name, address)

## Keywords

**DDL**

| Keyword | What it does |
|---|---|
| [CREATE TABLE](#create-table) | Create a table |
| [CREATE VIEW](#create-view) | Create a view (a saved query used like a table) |
| [CREATE SCHEMA](#create-schema) | Create a schema |
| [DROP](#drop) | Delete a table, view, schema, or constraint |
| [ALTER TABLE](#alter-table) | Change an existing table: add/drop columns, change defaults, add/drop constraints |
| [PRIMARY KEY](#create-table) | Primary key: no duplicates, no NULL |
| [UNIQUE](#create-table) | No duplicates (candidate key) |
| [FOREIGN KEY … REFERENCES](#create-table) | Foreign key: the value must exist in the referenced table's primary key, or be NULL (the referenced table can be the table itself, e.g. Super_ssn → EMPLOYEE) |
| [NOT NULL](#create-table) | This column must have a value |
| [DEFAULT](#default-named-constraints-on-delete-on-update) | Filled in automatically when an insert gives no value |
| [CHECK](#constraint-syntax) | Custom condition, e.g. `CHECK (Dnumber > 0)` |
| [CONSTRAINT name](#default-named-constraints-on-delete-on-update) | Name a constraint so you can drop it by name later |
| [ON DELETE / ON UPDATE](#default-named-constraints-on-delete-on-update) | What the foreign key side does when the referenced row is deleted / updated |
| [CASCADE](#default-named-constraints-on-delete-on-update) | Delete / update along with it |
| [SET NULL / SET DEFAULT](#default-named-constraints-on-delete-on-update) | Set the foreign key to NULL / its default |
| [RESTRICT](#drop) | Refuse the operation if anything depends on it |

**DML — Queries**

| Keyword | What it does |
|---|---|
| [SELECT](#single-table-multi-table-queries) | Which columns |
| [FROM](#single-table-multi-table-queries) | From which tables |
| [WHERE](#single-table-multi-table-queries) | Filter rows |
| [DISTINCT](#distinct) | Remove duplicate results |
| [AS](#aliases-self-join) | Alias (a table or a column) |
| [*](#no-where-cartesian-product-select) | All columns |
| [ORDER BY … ASC / DESC](#order-by) | Sort: ascending / descending |
| [LIKE](#like-between) | Pattern match: `%` any number of characters, `_` exactly one character |
| [BETWEEN … AND …](#like-between) | Within a range (inclusive) |
| [IN (…)](#in-explicit-set) | Equal to one of the values in a set |
| [IS NULL / IS NOT NULL](#is-null) | Test for NULL (`= NULL` doesn't work) |
| [UNION / INTERSECT / EXCEPT](#set-operations-union) | Union / intersection / difference (deduplicated; add `ALL` to keep duplicates) |
| [ANY (SOME) / ALL](#type-1-subquery-in-where) | Compare against some / every value from a subquery |
| EXISTS / NOT EXISTS | Whether the subquery returns any rows |
| [WITH](#type-4-with-cte) | Define a temporary result (CTE) first, then use it in the query after |
| CASE WHEN … THEN … ELSE … END | Pick a value based on conditions |

**DML — JOIN**

| Keyword | What it does |
|---|---|
| [JOIN … ON (INNER JOIN)](#inner-join-natural-join-multi-table-join) | Rows that match on both sides |
| [LEFT OUTER JOIN](#practice-four-joins-mysql) | Keep every left row; unmatched right side is NULL |
| [RIGHT OUTER JOIN](#practice-four-joins-mysql) | Keep every right row; unmatched left side is NULL |
| [FULL OUTER JOIN](#practice-four-joins-mysql) | Keep every row from both sides |
| [NATURAL JOIN](#inner-join-natural-join-multi-table-join) | Join automatically on columns with the same name |

**DML — Aggregation**

| Keyword | What it does |
|---|---|
| [COUNT / SUM / AVG / MAX / MIN](#aggregate-functions) | Count / sum / average / max / min (ignore NULL; `COUNT(*)` counts all rows) |
| [GROUP BY](#group-by) | Group by a column, one aggregate per group |
| [HAVING](#having) | Filter groups after grouping (`WHERE` filters rows before grouping) |

**DML — Insert / Update / Delete**

| Keyword | What it does |
|---|---|
| [INSERT INTO … VALUES](#insert) | Insert rows (can also take a `SELECT` to insert query results) |
| [UPDATE … SET … WHERE](#update) | Modify rows that match the condition |
| [DELETE FROM … WHERE](#delete) | Delete rows that match the condition (no WHERE deletes everything) |

---

# I. DDL

## 1. CREATE — Schemas and Tables

<h3 id="create-schema">CREATE SCHEMA</h3>

```sql
CREATE SCHEMA COMPANY AUTHORIZATION 'Jsmith';
```

<h3 id="create-table">CREATE TABLE</h3>

```sql
CREATE TABLE DEPARTMENT (
    Dname           VARCHAR(15) NOT NULL,
    Dnumber         INT         NOT NULL,
    Mgr_ssn         CHAR(9)     NOT NULL,
    Mgr_start_date  DATE,
    PRIMARY KEY (Dnumber),
    UNIQUE (Dname),
    FOREIGN KEY (Mgr_ssn) REFERENCES EMPLOYEE(Ssn)
);
```

> One statement with all three kinds of constraint: PK, UNIQUE (candidate key), FK

<h3 id="constraint-syntax">Constraint Syntax</h3>

```sql
-- Attribute constraint: CHECK
Dnumber INT NOT NULL CHECK (Dnumber > 0 AND Dnumber < 21)

-- Tuple constraint: goes at the end of CREATE TABLE, checked on every row
CHECK (Dept_create_date <= Mgr_start_date)

-- Primary key / candidate key
Dnumber INT PRIMARY KEY
Dname   VARCHAR(15) UNIQUE
```

<h3 id="default-named-constraints-on-delete-on-update">DEFAULT, Named Constraints, ON DELETE / ON UPDATE</h3>

```sql
CREATE TABLE EMPLOYEE (
    ...,
    Dno INT NOT NULL DEFAULT 1,

    CONSTRAINT EMPPK
        PRIMARY KEY (Ssn),

    CONSTRAINT EMPSUPERFK
        FOREIGN KEY (Super_ssn) REFERENCES EMPLOYEE(Ssn)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT EMPDEPTFK
        FOREIGN KEY (Dno) REFERENCES DEPARTMENT(Dnumber)
        ON DELETE SET DEFAULT
        ON UPDATE CASCADE
);
```

> Another option: `ON DELETE CASCADE` (deleting a parent row also deletes its child rows)


## 2. DROP / ALTER — Changing Structure

<h3 id="drop">DROP</h3>

```sql
-- Delete it along with everything inside
DROP SCHEMA COMPANY CASCADE;

-- Fails if the table is referenced
DROP TABLE DEPENDENT RESTRICT;
```

<h3 id="alter-table">ALTER TABLE</h3>

`ALTER TABLE` = the table already exists and you go back to change its **structure** (dropping a column also deletes that column's data). `COMPANY.EMPLOYEE` means "the EMPLOYEE table in the COMPANY schema"; inside the current schema you can just write `EMPLOYEE`

```sql
-- ① Add a column: every existing row starts with NULL in it
ALTER TABLE COMPANY.EMPLOYEE ADD COLUMN Job VARCHAR(12);

-- ② Drop a column
--    CASCADE: if a view / constraint uses Address, drop it too
--    RESTRICT: if anything uses Address, refuse to drop
ALTER TABLE COMPANY.EMPLOYEE DROP COLUMN Address CASCADE;

-- ③ Change the default (an insert that omits this column gets the default)
ALTER TABLE COMPANY.DEPARTMENT ALTER COLUMN Mgr_ssn DROP DEFAULT;
ALTER TABLE COMPANY.DEPARTMENT ALTER COLUMN Mgr_ssn SET DEFAULT '333445555';

-- ④ Drop a constraint: EMPSUPERFK is the name given with CONSTRAINT at create time (the Super_ssn foreign key)
--    To drop by name, you have to name it when creating the table
ALTER TABLE COMPANY.EMPLOYEE DROP CONSTRAINT EMPSUPERFK CASCADE;
```

| Goal | Syntax |
|---|---|
| Add a column | `ADD COLUMN column type` |
| Drop a column | `DROP COLUMN column CASCADE / RESTRICT` |
| Change the default | `ALTER COLUMN column SET DEFAULT value` / `DROP DEFAULT` |
| Drop a constraint | `DROP CONSTRAINT constraint_name` |


## 3. VIEW

<h3 id="create-view">CREATE VIEW</h3>

```sql
-- V1: column names come from the base tables
CREATE VIEW WORKS_ON1 AS
SELECT Fname, Lname, Pname, Hours
FROM EMPLOYEE, PROJECT, WORKS_ON
WHERE Ssn = Essn AND Pno = Pnumber;

-- V2: name the columns yourself
CREATE VIEW DEPT_INFO (Dept_name, No_of_emps, Total_sal) AS
SELECT Dname, COUNT(*), SUM(Salary)
FROM DEPARTMENT, EMPLOYEE
WHERE Dnumber = Dno
GROUP BY Dname;
```

### Non-updatable Views (Aggregate Columns)

```sql
-- UV2: Total_sal is computed, so this can't run
UPDATE DEPT_INFO
SET Total_sal = 100000
WHERE Dname = 'Research';
```

> Total_sal is the SUM of 4 employees' salaries (133000); there's no way to tell which salaries to change to make it 100000. Update not permitted on aggregate views; an updatable view is defined on a single table, has no aggregates, and preserves the primary key

### Views for Access Control

```sql
CREATE VIEW DEPT5EMP AS
SELECT *
FROM EMPLOYEE
WHERE Dno = 5;
```

### Using a View

```sql
-- Query a view like a table
SELECT * FROM DEPT5EMP;

-- Dispose of a view
DROP VIEW DEPT5EMP;
```


---

# II. DML

## 4. Basic Queries: SELECT-FROM-WHERE

<h3 id="single-table-multi-table-queries">Single-table / Multi-table Queries</h3>

```sql
-- Q0: birth date and address of John B. Smith
SELECT Bdate, Address
FROM EMPLOYEE
WHERE Fname = 'John' AND Minit = 'B' AND Lname = 'Smith';

-- Q1: name and address of every employee in the Research department
SELECT Fname, Lname, Address
FROM EMPLOYEE, DEPARTMENT
WHERE Dname = 'Research' AND Dnumber = Dno;

-- Q2: projects located in Stafford: project number, controlling department number, manager's last name / address / birth date
SELECT Pnumber, Dnum, Lname, Address, Bdate
FROM PROJECT, DEPARTMENT, EMPLOYEE
WHERE Dnum = Dnumber
  AND Mgr_ssn = Ssn
  AND Plocation = 'Stafford';
```

<h3 id="aliases-self-join">Aliases / Self-join</h3>

```sql
-- Q8A: each employee and their direct supervisor (self-join + renamed result columns)
SELECT E.Lname AS Employee_name, S.Lname AS Supervisor_name
FROM EMPLOYEE AS E, EMPLOYEE AS S
WHERE E.Super_ssn = S.Ssn;

-- Rename the columns too
EMPLOYEE AS E (Fn, Mi, Ln, Ssn, Bd, Addr, Sex, Sal, Sssn, Dno)
```

> When two tables have a **column with the same name**, you must write `table.column` or `alias.column` to tell them apart, or you get an "ambiguous" error

<h3 id="no-where-cartesian-product-select">No WHERE = Cartesian Product; SELECT *</h3>

```sql
-- Q9
SELECT Ssn
FROM EMPLOYEE;

-- Q10: every EMPLOYEE × DEPARTMENT combination
SELECT Ssn, Dname
FROM EMPLOYEE, DEPARTMENT;

-- Q1C
SELECT *
FROM EMPLOYEE
WHERE Dno = 5;
```

<h3 id="distinct">DISTINCT</h3>

```sql
-- Q11A: deduplicate (without DISTINCT, duplicates are kept by default)
SELECT DISTINCT Salary
FROM EMPLOYEE;
```

<h3 id="set-operations-union">Set Operations: UNION</h3>

```sql
-- Q4A: projects involving an employee named Smith (as a worker or as manager of the controlling department)
(SELECT DISTINCT Pnumber
 FROM PROJECT, DEPARTMENT, EMPLOYEE
 WHERE Dnum = Dnumber AND Mgr_ssn = Ssn AND Lname = 'Smith')
UNION
(SELECT DISTINCT Pnumber
 FROM PROJECT, WORKS_ON, EMPLOYEE
 WHERE Pnumber = Pno AND Essn = Ssn AND Lname = 'Smith');
```

<h3 id="like-between">LIKE / BETWEEN</h3>

```sql
-- %: any number of characters (the data has a space after the comma, so the pattern needs one too)
WHERE Address LIKE '%Houston, TX%'

-- _: exactly one character
WHERE Ssn LIKE '__1__8901'

-- Q14 fragment
WHERE (Salary BETWEEN 30000 AND 40000) AND Dno = 5
```

<h3 id="in-explicit-set">IN (Explicit Set)</h3>

```sql
-- Q17
SELECT DISTINCT Essn
FROM WORKS_ON
WHERE Pno IN (1, 2, 3);
```

### Arithmetic

```sql
-- Q13: salaries after a 10% raise for employees on the ProductX project
SELECT E.Fname, E.Lname, 1.1 * E.Salary AS Increased_sal
FROM EMPLOYEE AS E, WORKS_ON AS W, PROJECT AS P
WHERE E.Ssn = W.Essn
  AND W.Pno = P.Pnumber
  AND P.Pname = 'ProductX';
```

<h3 id="order-by">ORDER BY</h3>

```sql
ORDER BY D.Dname DESC, E.Lname ASC, E.Fname ASC
```


## 5. NULL

<h3 id="is-null">IS NULL</h3>

```sql
-- Q18: employees with no supervisor
SELECT Fname, Lname
FROM EMPLOYEE
WHERE Super_ssn IS NULL;
```

> Any comparison with NULL (even `NULL = NULL`) is UNKNOWN; use `IS NULL`


## 6. Nested Queries (Subqueries)

<h3 id="type-1-subquery-in-where">Type 1: Subquery in WHERE</h3>

```sql
-- Type 1-1: single-row subquery (use =)
SELECT Fname, Lname
FROM EMPLOYEE
WHERE Ssn = (
    SELECT MIN(Essn)
    FROM DEPENDENT
    WHERE Sex = 'F'
);

-- Type 1-2: multi-row subquery (use IN, comparing tuples)
SELECT DISTINCT Essn
FROM WORKS_ON
WHERE (Pno, Hours) IN (
    SELECT Pno, Hours
    FROM WORKS_ON
    WHERE Essn = '123456789'
);
```

```sql
-- > ALL: paid more than everyone in department 5
SELECT Lname, Fname
FROM EMPLOYEE
WHERE Salary > ALL (
    SELECT Salary
    FROM EMPLOYEE
    WHERE Dno = 5
);
```

> `= ANY` (`= SOME`) is equivalent to `IN`; ANY/SOME also work with `> >= < <= <>`

### Aliases to Avoid Ambiguity / Correlated Subqueries

```sql
-- Q16: employees with a dependent who has the same first name and sex
SELECT E.Fname, E.Lname
FROM EMPLOYEE AS E
WHERE E.Ssn IN (
    SELECT D.Essn
    FROM DEPENDENT AS D
    WHERE E.Fname = D.Dependent_name
      AND E.Sex = D.Sex
);
```

> **correlated**: the subquery references the outer E, so it is re-evaluated for every outer row

### Type 2: Subquery in FROM (Inline View)

```sql
SELECT E.Dno, COUNT(*)
FROM EMPLOYEE AS E,
     (SELECT Dno
      FROM EMPLOYEE
      GROUP BY Dno
      HAVING COUNT(*) > 1) AS BIGDEPT
WHERE E.Salary > 40000
  AND E.Dno = BIGDEPT.Dno
GROUP BY E.Dno;
```

### Type 3: Subquery in SELECT (Scalar Subquery)

```sql
-- Must return a single column and a single value
SELECT (
    SELECT MAX(E.Salary)
    FROM EMPLOYEE AS E
    WHERE E.Dno = D.Dnumber
) AS Max_sal
FROM DEPARTMENT AS D;
```

<h3 id="type-4-with-cte">Type 4: WITH (CTE)</h3>

```sql
WITH CTE AS (
    SELECT Dno
    FROM EMPLOYEE
    GROUP BY Dno
    HAVING COUNT(*) > 1
)
SELECT E.Dno, COUNT(*)
FROM EMPLOYEE AS E, CTE
WHERE E.Salary > 40000
  AND E.Dno = CTE.Dno
GROUP BY E.Dno;
```


## 7. JOIN

<h3 id="inner-join-natural-join-multi-table-join">INNER JOIN / NATURAL JOIN / Multi-table JOIN</h3>

```sql
-- Q1A: JOIN can also be written INNER JOIN
SELECT Fname, Lname, Address
FROM EMPLOYEE JOIN DEPARTMENT ON Dno = Dnumber
WHERE Dname = 'Research';

-- Q1B: rename DEPARTMENT's columns so Dno has the same name, then NATURAL JOIN
SELECT Fname, Lname, Address
FROM EMPLOYEE NATURAL JOIN DEPARTMENT AS DEPT (Dname, Dno, Mssn, Msdate)
WHERE Dname = 'Research';

-- Q2A: multi-table JOIN
SELECT Pnumber, Dnum, Lname, Address, Bdate
FROM PROJECT
    JOIN DEPARTMENT ON Dnum = Dnumber
    JOIN EMPLOYEE ON Mgr_ssn = Ssn
WHERE Plocation = 'Stafford';
```

<h3 id="practice-four-joins-mysql">Practice: Four JOINs (MySQL)</h3>

```sql
-- Set up data: CREATE TABLE is DDL, INSERT is DML
CREATE TABLE STUDENT (Sid INT, Sname VARCHAR(10), Dno INT);
INSERT INTO STUDENT VALUES (1, 'Lee', 20), (2, 'Patel', 30), (3, 'Peng', 40);

CREATE TABLE DEPT (Dnumber INT, Dname VARCHAR(10), Dlocation VARCHAR(10));
INSERT INTO DEPT VALUES (10, 'EE', 'NY'), (20, 'CS', 'SJ'), (30, 'DS', 'SF');
```

```sql
-- INNER: Lee, Patel
SELECT * FROM STUDENT INNER JOIN DEPT ON Dno = Dnumber;

-- LEFT: plus Peng (DEPT columns are NULL)
SELECT * FROM STUDENT LEFT OUTER JOIN DEPT ON Dno = Dnumber;

-- RIGHT: plus EE (STUDENT columns are NULL)
SELECT * FROM STUDENT RIGHT OUTER JOIN DEPT ON Dno = Dnumber;

-- FULL: standard syntax
SELECT * FROM STUDENT FULL OUTER JOIN DEPT ON Dno = Dnumber;

-- MySQL doesn't support FULL OUTER JOIN; use LEFT ∪ RIGHT instead
SELECT * FROM STUDENT LEFT OUTER JOIN DEPT ON Dno = Dnumber
UNION
SELECT * FROM STUDENT RIGHT OUTER JOIN DEPT ON Dno = Dnumber;
```


## 8. Aggregation / GROUP BY / HAVING

<h3 id="aggregate-functions">Aggregate Functions</h3>

```sql
-- Q19A: company-wide salary stats (renamed result columns)
SELECT SUM(Salary) AS Total_sal,
       MAX(Salary) AS Highest_sal,
       MIN(Salary) AS Lowest_sal,
       AVG(Salary) AS Average_sal
FROM EMPLOYEE;

-- Q20: salary stats for the Research department
SELECT SUM(Salary), MAX(Salary), MIN(Salary), AVG(Salary)
FROM EMPLOYEE JOIN DEPARTMENT ON Dno = Dnumber
WHERE Dname = 'Research';

-- Q22: number of employees in Research
SELECT COUNT(*)
FROM EMPLOYEE, DEPARTMENT
WHERE Dno = Dnumber AND Dname = 'Research';
```

> `COUNT(*)` counts all rows; `COUNT(column)` skips NULLs

<h3 id="group-by">GROUP BY</h3>

```sql
-- Q24: headcount and average salary per department
SELECT Dno, COUNT(*), AVG(Salary)
FROM EMPLOYEE
GROUP BY Dno;
```

<h3 id="having">HAVING</h3>

```sql
-- Q26: projects with more than 2 workers
SELECT Pnumber, Pname, COUNT(*)
FROM PROJECT, WORKS_ON
WHERE Pnumber = Pno
GROUP BY Pnumber, Pname
HAVING COUNT(*) > 2;

-- Departments with more than 3 employees → only Dno = 5 remains (4 people, average 33250)
SELECT Dno, COUNT(*), AVG(Salary)
FROM EMPLOYEE
GROUP BY Dno
HAVING COUNT(*) > 3;
```

> WHERE filters rows **before** grouping; HAVING filters groups **after** grouping

### Full Query Block Structure

> `[ ]` = optional, `...` = can repeat

```sql
SELECT [DISTINCT] column | function(column) | *, ...
FROM table_name [alias], ...
[WHERE condition]
[GROUP BY column, ...]
[HAVING group_condition]
[ORDER BY column [ASC | DESC], ...];
```


## 9. INSERT / UPDATE / DELETE

<h3 id="insert">INSERT</h3>

```sql
-- U1: insert one row; every value (NULL included) must be given, in the order the table was created
INSERT INTO EMPLOYEE VALUES (
    'Richard', 'K', 'Marini', '653298653', '1962-12-30',
    '98 Oak Forest, Katy, TX', 'M', 37000, '653298653', 4
);

-- U3B: insert multiple rows from a query result (the WORKS_ON_INFO table must already exist)
INSERT INTO WORKS_ON_INFO (Emp_name, Proj_name, Hours_per_week)
SELECT E.Lname, P.Pname, W.Hours
FROM PROJECT AS P, WORKS_ON AS W, EMPLOYEE AS E
WHERE P.Pnumber = W.Pno AND W.Essn = E.Ssn;
```

### Create a Table and Load Data in One Step

```sql
-- Create a new table D5EMPS holding the employees of department 5 (MySQL syntax)
CREATE TABLE D5EMPS AS
SELECT * FROM EMPLOYEE WHERE Dno = 5;
```

> The standard SQL syntax is `CREATE TABLE D5EMPS LIKE EMPLOYEE (SELECT …) WITH DATA;`, which MySQL doesn't support

<h3 id="update">UPDATE</h3>

```sql
-- U5: change project 10's location and controlling department
UPDATE PROJECT
SET Plocation = 'Bellaire',
    Dnum = 5
WHERE Pnumber = 10;

-- U6: 10% raise for everyone in the Research department
UPDATE EMPLOYEE
SET Salary = Salary * 1.1
WHERE Dno IN (
    SELECT Dnumber
    FROM DEPARTMENT
    WHERE Dname = 'Research'
);
```

> The SALARY on the right of `=` is the old value before the update; the left side is the new value

<h3 id="delete">DELETE</h3>

```sql
-- U4A
DELETE FROM EMPLOYEE
WHERE Lname = 'Brown';

-- U4D: no WHERE → empties the whole table
DELETE FROM EMPLOYEE;
```
