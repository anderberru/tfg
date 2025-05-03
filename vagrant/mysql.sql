CREATE DATABASE struts;

CREATE USER 'struts'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
GRANT ALL PRIVILEGES ON struts.* TO 'struts'@'%';
FLUSH PRIVILEGES;
