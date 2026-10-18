1、这是一个记工系统，用于在不方便在线记工的情况下手动录入记录。仅个人使用。与考勤系统不同，记工系统适用于非固定的时间、人员。
2、使用electron，但相比网页版仅仅只是多了自动启动pocketbase后端数据库的能力。也就是说在后端数据库运行的情况下，网页版和electron版本无区别。
3、使用powershell命令，而非bash命令，也不要混杂。
4、为了避免中文乱码，运行powershell命令之前加上：[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::InputEncoding=[Text.Encoding]::UTF8; $OutputEncoding=[Text.Encoding]::UTF8; chcp 65001|Out-Null
5、使用了react编译器，所以非必要不使用记忆化。
6、用中文回答。
7、使用pnpm、pnx等，而非npm、npx
8、项目使用了codegraph。