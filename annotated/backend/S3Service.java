package com.whiteboard.app.service;

// The AWS SDK's default strategy for figuring out WHICH credentials to use: it checks, in
// order, environment variables, Java system properties, a credentials file on disk, and
// (if running on actual AWS infrastructure) an attached IAM role -- so the same code works
// both locally (with env vars) and in most cloud deployments, without hardcoding secrets.
import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
// The main interface for talking to Amazon S3.
import com.amazonaws.services.s3.AmazonS3;
// A "builder" class used to construct a properly configured AmazonS3 client instance.
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
// An enum of pre-defined S3 access control settings; we use PublicRead so uploaded images
// can be viewed via a plain URL without needing signed/authenticated requests.
import com.amazonaws.services.s3.model.CannedAccessControlList;
// Describes metadata about the file being uploaded (its content type, size, etc).
import com.amazonaws.services.s3.model.ObjectMetadata;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.UUID;

// Uploads saved board images to S3. AWS credentials are picked up automatically
// from env vars / IAM role by DefaultAWSCredentialsProviderChain.
// @Service is functionally similar to @Component (marks this as a Spring-managed bean), but
// specifically signals "this class holds business logic," which is more about communicating
// intent to other developers than changing actual behavior.
@Service
public class S3Service {

    // Injected from application.properties' "aws.s3.bucket" value -- currently "skitch-board".
    @Value("${aws.s3.bucket}")
    private String bucket;

    // Injected from "aws.region" -- currently "eu-north-1".
    @Value("${aws.region}")
    private String region;

    // A private helper that builds a fresh S3 client on demand. Note: this creates a NEW
    // client every time it's called, rather than building one once and reusing it -- a real
    // production system would likely cache this, but for a project this size (and low request
    // volume) the simplicity of "just build one when needed" isn't a meaningful performance cost.
    private AmazonS3 client() {
        return AmazonS3ClientBuilder.standard()
                .withRegion(region) // which AWS region to talk to
                .withCredentials(new DefaultAWSCredentialsProviderChain()) // how to authenticate (see import comment above)
                .build(); // finalize and construct the actual client object
    }

    // Accepts a data URL like "data:image/png;base64,...." and returns the S3 key it was saved under.
    public String uploadBoardImage(String dataUrl) {
        // A data URL looks like "data:image/png;base64,iVBORw0KG...". indexOf(',') finds where
        // the actual base64 payload starts (right after the comma); substring from there to the
        // end gives us just the encoded image bytes as text, discarding the "data:image/png;base64,"
        // prefix which is just metadata describing the format, not part of the image data itself.
        String base64Payload = dataUrl.substring(dataUrl.indexOf(',') + 1);
        // Base64 is a way to represent binary data as plain text; decode it back into the
        // actual raw bytes of the PNG file.
        byte[] bytes = Base64.getDecoder().decode(base64Payload);
        // Build a unique filename/key for this upload: a folder-like prefix "boards/" plus a
        // randomly generated UUID (a 128-bit random identifier, astronomically unlikely to
        // collide with any other), plus the .png extension.
        String key = "boards/" + UUID.randomUUID() + ".png";

        // Describe the file we're about to upload: its MIME type (so browsers know to render
        // it as an image rather than download it as generic binary data) and its size in bytes
        // (S3 requires knowing the content length up front for this kind of upload).
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType("image/png");
        metadata.setContentLength(bytes.length);

        // Build a fresh S3 client (see the client() method above).
        AmazonS3 s3 = client();
        // The actual upload: which bucket, what key/filename, the data itself wrapped in a
        // stream (ByteArrayInputStream turns our raw byte array into the stream-based API S3
        // expects), and the metadata describing it.
        s3.putObject(bucket, key, new ByteArrayInputStream(bytes), metadata);
        // By default, newly uploaded S3 objects are private (only accessible with AWS
        // credentials). This line explicitly changes this specific object's permissions to
        // "anyone with the URL can view it," which is what lets the "View saved" link in the
        // toolbar actually work in a plain browser tab.
        s3.setObjectAcl(bucket, key, CannedAccessControlList.PublicRead);

        // Hand back just the key (e.g. "boards/abc-123.png") -- BoardController is responsible
        // for turning this into a full URL (with or without a CloudFront domain in front of it).
        return key;
    }
}
