import re

with open('client/pages/EmployeePortal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix saveAttendance: change select("id") to select("id, check_in, check_out")
content = content.replace(
    '.select("id")\n        .eq("emp_id", user.empId)\n        .eq("date", date)\n        .order("created_at", { ascending: false })\n        .limit(1);\n      if (lookupError) throw lookupError;\n\n      const attendanceData = {\n        emp_id: user.empId,\n        emp_name: user.name,\n        department: employeeDepartment || null,\n        date,\n        status: "\u062d\u0627\u0636\u0631",\n        ...(mode === "in" ? { check_in: time } : { check_out: time }),\n      };\n\n      const { error } = existing?.length\n        ? await supabase.from("attendance").update(attendanceData).eq("id", existing[0].id)\n        : await supabase.from("attendance").insert([attendanceData]);\n      if (error) throw error;\n      return true;\n    } catch (error: any) {\n      console.error("Attendance save failed:", error);\n      toast.error(error?.message || "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u062d\u0636\u0648\u0631 \u0641\u064a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a");\n      return false;\n    }\n  };',
    '.select("id, check_in, check_out")\n        .eq("emp_id", user.empId)\n        .eq("date", date)\n        .order("created_at", { ascending: false })\n        .limit(1);\n      if (lookupError) throw lookupError;\n\n      const rec = (existing ?? [])[0] as\n        | { id: string; check_in: string | null; check_out: string | null }\n        | undefined;\n\n      if (mode === "in") {\n        if (rec) {\n          const { error } = await supabase.from("attendance")\n            .update({ check_in: time, status: "\u062d\u0627\u0636\u0631", emp_name: user.name, department: employeeDepartment || null })\n            .eq("id", rec.id);\n          if (error) throw error;\n        } else {\n          const { error } = await supabase.from("attendance").insert([{\n            emp_id: user.empId, emp_name: user.name,\n            department: employeeDepartment || null,\n            date, status: "\u062d\u0627\u0636\u0631", check_in: time,\n          }]);\n          if (error) throw error;\n        }\n      } else {\n        if (!rec?.check_in) {\n          toast.error("\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0636\u0648\u0631 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641");\n          return false;\n        }\n        const { error } = await supabase.from("attendance")\n          .update({ check_out: time }).eq("id", rec.id);\n        if (error) throw error;\n      }\n      return true;\n    } catch (error: any) {\n      console.error("Attendance save failed:", error);\n      toast.error(error?.message || "\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0627\u0644\u062d\u0636\u0648\u0631 \u0641\u064a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a");\n      return false;\n    }\n  };'
)

# Fix openCamera: add guard checks before opening camera
old_cam = '    setCameraMode(mode);\n    setVerifyStatus("idle");\n    setCameraOpen(true);'
new_cam = '''    // block checkout before checkin
    if (mode === "out" && !checkInTime) {
      toast.error("\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062d\u0636\u0648\u0631 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641");
      return;
    }
    if (mode === "in" && checkInTime) {
      toast.info("\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u062d\u0636\u0648\u0631\u0643 \u0645\u0633\u0628\u0642\u0627\u064b \u0644\u0647\u0630\u0627 \u0627\u0644\u064a\u0648\u0645");
      return;
    }
    setCameraMode(mode);
    setVerifyStatus("idle");
    setCameraOpen(true);'''

content = content.replace(old_cam, new_cam, 1)

with open('client/pages/EmployeePortal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done. Lines with saveAttendance:", content.count('saveAttendance'))
print("checkInTime guard present:", 'block checkout before checkin' in content)
