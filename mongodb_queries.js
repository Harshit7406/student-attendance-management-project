
/*
  PROJECT: Student Attendance Management System
  DATABASE: StudentAttendanceDB
  TECHNOLOGY: MongoDB

  Review 2 includes:
  1. Database and collection creation
  2. Sample data insertion
  3. CRUD operations
  4. Five aggregation queries
  5. Index creation and verification
  6. Record-count verification

  IMPORTANT:
  Run sections individually in MongoDB Shell.
  The SAMPLE DATA section deletes existing documents first.
  Do not run that section again unless you intend to reset the data.
*/

// ======================================================
// 1. DATABASE AND COLLECTION CREATION
// ======================================================

use("StudentAttendanceDB");

const collectionNames = [
  "users",
  "students",
  "faculty",
  "courses",
  "enrollments",
  "attendance"
];

collectionNames.forEach(name => {
  if (!db.getCollectionNames().includes(name)) {
    db.createCollection(name);
  }
});

print("Collections:");
printjson(db.getCollectionNames());


// ======================================================
// 2. SAMPLE DATA INSERTION
// WARNING: THIS SECTION CLEARS THE SIX COLLECTIONS FIRST
// Run only when you want to reset and reload sample data.
// ======================================================

// Uncomment these lines only if intentionally resetting:
// db.users.deleteMany({});
// db.students.deleteMany({});
// db.faculty.deleteMany({});
// db.courses.deleteMany({});
// db.enrollments.deleteMany({});
// db.attendance.deleteMany({});

// USERS: 5 records
// Each student below uses an existing student user ID.
db.users.insertMany([
  { user_id: "U001", username: "admin", role: "admin", active: true },
  { user_id: "U002", username: "faculty1", role: "faculty", active: true },
  { user_id: "U003", username: "student1", role: "student", active: true },
  { user_id: "U004", username: "faculty2", role: "faculty", active: true },
  { user_id: "U005", username: "student2", role: "student", active: true }
]);

// STUDENTS: 10 records
// Students S001-S010 reference existing users U003-U005
// Multiple students may share a user ID in this sample dataset.
const students = [];
for (let i = 1; i <= 10; i++) {
  students.push({
    student_id: "S" + String(i).padStart(3, "0"),
    name: "Student " + i,
    email: "student" + i + "@example.com",
    branch: i % 2 === 0 ? "CSE" : "BKT",
    semester: 5,
    user_id: "U" + String(((i - 1) % 3) + 3).padStart(3, "0")
  });
}
db.students.insertMany(students);

// FACULTY: 5 records
const faculty = [];
for (let i = 1; i <= 5; i++) {
  faculty.push({
    faculty_id: "F" + String(i).padStart(3, "0"),
    name: "Faculty " + i,
    department: i % 2 === 0 ? "IT" : "CSE",
    email: "faculty" + i + "@example.com"
  });
}
db.faculty.insertMany(faculty);

// COURSES: 5 records
const courseNames = [
  "Database Systems Lab",
  "Operating Systems",
  "Computer Networks",
  "Compiler Design",
  "Design and Analysis of Algorithms"
];

const courses = [];
for (let i = 1; i <= 5; i++) {
  courses.push({
    course_id: "C" + String(i).padStart(3, "0"),
    course_name: courseNames[i - 1],
    faculty_id: "F" + String(i).padStart(3, "0"),
    credits: 3
  });
}
db.courses.insertMany(courses);

// ENROLLMENTS: 20 records
const enrollments = [];
for (let s = 1; s <= 10; s++) {
  for (let c = 1; c <= 2; c++) {
    enrollments.push({
      enrollment_id: "E" + String((s - 1) * 2 + c).padStart(3, "0"),
      student_id: "S" + String(s).padStart(3, "0"),
      course_id: "C" + String(c).padStart(3, "0"),
      semester: 5,
      status: "Enrolled"
    });
  }
}
db.enrollments.insertMany(enrollments);

// ATTENDANCE: 60 records
const attendance = [];
let attendanceNumber = 1;

for (let s = 1; s <= 10; s++) {
  for (let day = 1; day <= 6; day++) {
    attendance.push({
      attendance_id: "A" + String(attendanceNumber++).padStart(3, "0"),
      student_id: "S" + String(s).padStart(3, "0"),
      course_id: "C00" + ((s % 2) + 1),
      date: new Date(Date.UTC(2026, 8, day)),
      status: (s + day) % 4 === 0 ? "Absent" : "Present"
    });
  }
}
db.attendance.insertMany(attendance);

print("Sample data inserted.");


// ======================================================
// 3. CRUD OPERATIONS
// Run individually as a demonstration.
// The test student is deleted at the end.
// ======================================================

// CREATE: insert a temporary test student
db.students.insertOne({
  student_id: "S011",
  name: "Rahul Sharma",
  email: "rahul@example.com",
  branch: "CSE",
  semester: 5,
  user_id: "U003"
});

// READ: display all students
db.students.find().toArray();

// READ: find a student by ID
db.students.findOne({ student_id: "S001" });

// READ: find students from the CSE branch
db.students.find({ branch: "CSE" }).toArray();

// UPDATE: change the test student's semester
db.students.updateOne(
  { student_id: "S011" },
  { $set: { semester: 6 } }
);

// Verify the update
db.students.findOne({ student_id: "S011" });

// UPDATE: mark attendance A001 as Absent
db.attendance.updateOne(
  { attendance_id: "A001" },
  { $set: { status: "Absent" } }
);

// Verify the attendance update
db.attendance.findOne({ attendance_id: "A001" });

// DELETE: remove the temporary test student
db.students.deleteOne({ student_id: "S011" });


// ======================================================
// 4. AGGREGATION QUERY 1
// Student-wise attendance percentage
// ======================================================

db.attendance.aggregate([
  {
    $group: {
      _id: "$student_id",
      totalClasses: { $sum: 1 },
      presentClasses: {
        $sum: {
          $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
        }
      }
    }
  },
  {
    $addFields: {
      attendancePercentage: {
        $round: [
          {
            $multiply: [
              { $divide: ["$presentClasses", "$totalClasses"] },
              100
            ]
          },
          2
        ]
      }
    }
  },
  {
    $lookup: {
      from: "students",
      localField: "_id",
      foreignField: "student_id",
      as: "studentDetails"
    }
  },
  { $unwind: "$studentDetails" },
  {
    $project: {
      _id: 0,
      student_id: "$_id",
      name: "$studentDetails.name",
      totalClasses: 1,
      presentClasses: 1,
      attendancePercentage: 1
    }
  },
  { $sort: { attendancePercentage: -1 } }
]).toArray();


// ======================================================
// 5. AGGREGATION QUERY 2
// Course-wise attendance statistics
// ======================================================

db.attendance.aggregate([
  {
    $group: {
      _id: "$course_id",
      totalRecords: { $sum: 1 },
      presentCount: {
        $sum: {
          $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
        }
      },
      absentCount: {
        $sum: {
          $cond: [{ $eq: ["$status", "Absent"] }, 1, 0]
        }
      }
    }
  },
  {
    $lookup: {
      from: "courses",
      localField: "_id",
      foreignField: "course_id",
      as: "courseDetails"
    }
  },
  { $unwind: "$courseDetails" },
  {
    $project: {
      _id: 0,
      course_id: "$_id",
      course_name: "$courseDetails.course_name",
      totalRecords: 1,
      presentCount: 1,
      absentCount: 1
    }
  },
  { $sort: { course_id: 1 } }
]).toArray();


// ======================================================
// 6. AGGREGATION QUERY 3
// Students with attendance below 75%
// ======================================================

db.attendance.aggregate([
  {
    $group: {
      _id: "$student_id",
      totalClasses: { $sum: 1 },
      presentClasses: {
        $sum: {
          $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
        }
      }
    }
  },
  {
    $addFields: {
      percentage: {
        $multiply: [
          { $divide: ["$presentClasses", "$totalClasses"] },
          100
        ]
      }
    }
  },
  { $match: { percentage: { $lt: 75 } } },
  {
    $lookup: {
      from: "students",
      localField: "_id",
      foreignField: "student_id",
      as: "student"
    }
  },
  { $unwind: "$student" },
  {
    $project: {
      _id: 0,
      student_id: "$_id",
      name: "$student.name",
      attendancePercentage: { $round: ["$percentage", 2] }
    }
  },
  { $sort: { attendancePercentage: 1 } }
]).toArray();


// ======================================================
// 7. AGGREGATION QUERY 4
// Daily attendance summary
// ======================================================

db.attendance.aggregate([
  {
    $group: {
      _id: "$date",
      totalRecords: { $sum: 1 },
      present: {
        $sum: {
          $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
        }
      },
      absent: {
        $sum: {
          $cond: [{ $eq: ["$status", "Absent"] }, 1, 0]
        }
      }
    }
  },
  { $sort: { _id: 1 } }
]).toArray();


// ======================================================
// 8. AGGREGATION QUERY 5
// Absent students with course details
// ======================================================

db.attendance.aggregate([
  { $match: { status: "Absent" } },
  {
    $lookup: {
      from: "students",
      localField: "student_id",
      foreignField: "student_id",
      as: "student"
    }
  },
  {
    $lookup: {
      from: "courses",
      localField: "course_id",
      foreignField: "course_id",
      as: "course"
    }
  },
  { $unwind: "$student" },
  { $unwind: "$course" },
  {
    $project: {
      _id: 0,
      student_name: "$student.name",
      course_name: "$course.course_name",
      date: 1,
      status: 1
    }
  },
  { $sort: { date: 1 } }
]).toArray();


// ======================================================
// 9. INDEX CREATION
// Run once. Duplicate index definitions may already exist.
// ======================================================

db.students.createIndex(
  { student_id: 1 },
  { unique: true }
);

db.courses.createIndex(
  { course_id: 1 },
  { unique: true }
);

db.attendance.createIndex({
  student_id: 1,
  course_id: 1,
  date: 1
});

db.attendance.createIndex({ status: 1 });

db.enrollments.createIndex(
  { student_id: 1, course_id: 1 },
  { unique: true }
);

print("Index creation attempted.");


// ======================================================
// 10. INDEX VERIFICATION
// ======================================================

print("STUDENT INDEXES");
printjson(db.students.getIndexes());

print("COURSE INDEXES");
printjson(db.courses.getIndexes());

print("ATTENDANCE INDEXES");
printjson(db.attendance.getIndexes());

print("ENROLLMENT INDEXES");
printjson(db.enrollments.getIndexes());


// ======================================================
// 11. RECORD-COUNT VERIFICATION
// Expected total: 105, after removing test student S011.
// ======================================================

print("Users:", db.users.countDocuments({}));
print("Students:", db.students.countDocuments({}));
print("Faculty:", db.faculty.countDocuments({}));
print("Courses:", db.courses.countDocuments({}));
print("Enrollments:", db.enrollments.countDocuments({}));
print("Attendance:", db.attendance.countDocuments({}));

print("TOTAL RECORDS:",
  db.users.countDocuments({}) +
  db.students.countDocuments({}) +
  db.faculty.countDocuments({}) +
  db.courses.countDocuments({}) +
  db.enrollments.countDocuments({}) +
  db.attendance.countDocuments({})
);
